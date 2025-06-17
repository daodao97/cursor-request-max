import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FeedbackMcpServer, ISidebarProvider, FeedbackResult } from './mcpServer';

let mcpServer: FeedbackMcpServer | null = null;
let serverPort = 3100;

export class SidebarView implements vscode.WebviewViewProvider, ISidebarProvider {
    public static readonly viewType = 'cursorMaxSidebarView';

    private _view?: vscode.WebviewView;
    private pendingFeedbackResolve: ((value: FeedbackResult) => void) | null = null;
    private pendingFeedbackReject: ((reason?: any) => void) | null = null;
    private pendingImageResolve: ((value: Buffer) => void) | null = null;
    private pendingImageReject: ((reason?: any) => void) | null = null;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    // 检查 .cursor 目录结构是否存在
    private checkCursorDirectoryStructure(): boolean {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return false;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const cursorDir = path.join(workspaceRoot, '.cursor');
        const mcpJsonPath = path.join(cursorDir, 'mcp.json');
        const rulesDir = path.join(cursorDir, 'rules');
        const cursorRequestMaxPath = path.join(rulesDir, 'cursor-requext-max.mdc');

        try {
            // 检查每个必需的路径是否存在
            const cursorDirExists = fs.existsSync(cursorDir);
            const rulesDirExists = fs.existsSync(rulesDir);
            const cursorRequestMaxExists = fs.existsSync(cursorRequestMaxPath);
            
            // 检查 mcp.json 文件和其中的 cursor-request-max 配置
            let mcpJsonValid = false;
            if (fs.existsSync(mcpJsonPath)) {
                try {
                    const mcpJsonContent = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf8'));
                    console.log('mcp.json 文件内容:', JSON.stringify(mcpJsonContent, null, 2));
                    
                    const hasServers = mcpJsonContent.mcpServers;
                    const hasCursorMax = hasServers && mcpJsonContent.mcpServers['cursor-request-max'];
                    const hasUrl = hasCursorMax && mcpJsonContent.mcpServers['cursor-request-max'].url;
                    
                    console.log('mcp.json 配置检查:', {
                        hasServers: !!hasServers,
                        hasCursorMax: !!hasCursorMax,
                        hasUrl: !!hasUrl,
                        availableServers: hasServers ? Object.keys(mcpJsonContent.mcpServers) : []
                    });
                    
                    mcpJsonValid = !!(hasServers && hasCursorMax && hasUrl);
                    console.log('设置 mcpJsonValid 为:', mcpJsonValid);
                } catch (error) {
                    console.error('解析 mcp.json 失败:', error);
                    mcpJsonValid = false;
                    console.log('因解析错误，设置 mcpJsonValid 为:', mcpJsonValid);
                }
            } else {
                console.log('mcp.json 文件不存在，设置 mcpJsonValid 为:', mcpJsonValid);
            }

            console.log('目录结构检查:', {
                cursorDir: cursorDirExists,
                mcpJsonValid: mcpJsonValid,
                rulesDir: rulesDirExists,
                cursorRequestMax: cursorRequestMaxExists
            });

            // 任意一个不存在都返回 false
            const finalResult = cursorDirExists && mcpJsonValid && rulesDirExists && cursorRequestMaxExists;
            console.log('最终检查结果:', finalResult);
            return finalResult;
        } catch (error) {
            console.error('检查 .cursor 目录结构时出错:', error);
            return false;
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // 发送初始服务器状态
        setTimeout(() => {
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'serverStatus',
                    running: this.isServerRunning(),
                    serverType: 'MCP',
                    port: serverPort
                });

                // 主动检查 .cursor 目录结构
                const hasValidStructure = this.checkCursorDirectoryStructure();
                console.log('插件面板打开时检查 .cursor 目录结构:', hasValidStructure);
                
                this._view.webview.postMessage({
                    type: 'cursorDirectoryCheck',
                    hasValidStructure: hasValidStructure
                });
            }
        }, 100); // 短暂延迟确保 React 应用已加载

        // 处理从 webview 发送的消息
        webviewView.webview.onDidReceiveMessage(
            (message: any) => {
                switch (message.type) {
                    case 'startServer':
                        this.startMcpServer();
                        break;
                    case 'stopServer':
                        this.stopMcpServer();
                        break;
                    case 'openBrowser':
                        vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${serverPort}`));
                        break;
                    case 'chatMessage':
                        this.handleChatMessage(message.message);
                        break;
                    case 'feedbackSubmit':
                        this.handleFeedbackSubmit(message.data);
                        break;
                    case 'feedbackCancel':
                        this.handleFeedbackCancel();
                        break;
                    case 'imageSelect':
                        this.handleImageSelect(message.imageData);
                        break;
                    case 'imageCancel':
                        this.handleImageCancel();
                        break;
                    case 'selectImageFile':
                        this.handleSelectImageFile();
                        break;
                    case 'initCursorStructure':
                        // 触发初始化 .cursor 目录结构命令
                        vscode.commands.executeCommand('cursorMax.initCursorStructure');
                        break;
                    case 'reCheckCursorStructure':
                        // 重新检查 .cursor 目录结构
                        const hasValidStructure = this.checkCursorDirectoryStructure();
                        console.log('重新检查 .cursor 目录结构:', hasValidStructure);
                        
                        if (this._view) {
                            this._view.webview.postMessage({
                                type: 'cursorDirectoryCheck',
                                hasValidStructure: hasValidStructure
                            });
                        }
                        break;
                }
            }
        );
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // 获取 React 应用的构建文件
        const reactAppUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'assets', 'react-app.js')
        );

        // 获取 CSS 文件
        const cssUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'assets', 'react-asset-index.css')
        );

        // 使用 nonce 来保证安全性
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
        <html lang="zh-CN" class="dark">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Cursor Request Max MCP 服务器</title>
            <link rel="stylesheet" href="${cssUri}">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                }
                #root {
                    width: 100%;
                    height: 100vh;
                }
            </style>
        </head>
        <body class="dark:bg-gray-900 bg-white transition-colors">
            <div id="root"></div>
            <script nonce="${nonce}">
                // 使 VS Code API 全局可用
                window.acquireVsCodeApi = acquireVsCodeApi;
            </script>
            <script nonce="${nonce}" src="${reactAppUri}"></script>
        </body>
        </html>`;
    }

    private getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private handleChatMessage(message: string) {
        // 处理聊天消息，可以在这里集成 AI 服务
        console.log('收到聊天消息:', message);

        // 示例：向 webview 发送回复
        if (this._view) {
            this._view.webview.postMessage({
                type: 'chatReply',
                message: `您说的是: "${message}"`
            });
        }
    }

    public async startMcpServer() {
        if (mcpServer) {
            vscode.window.showWarningMessage('MCP 服务器已在运行中');
            return;
        }

        try {
            mcpServer = new FeedbackMcpServer();

            // 将当前侧边栏提供者设置到 MCP 服务器
            mcpServer.setSidebarProvider(this);

            // 启动服务器并获取实际使用的端口
            const actualPort = await mcpServer.start(serverPort);
            
            // 如果端口发生了变化，更新 serverPort
            if (actualPort !== serverPort) {
                console.log(`端口从 ${serverPort} 更改为 ${actualPort}`);
                serverPort = actualPort;
            }

            console.log(`MCP 服务器运行在 http://localhost:${serverPort}`);

            // 通知 React 应用服务器状态
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'serverStatus',
                    running: true,
                    serverType: 'MCP',
                    port: serverPort
                });
            }

        } catch (error: any) {
            console.error('MCP 服务器启动失败:', error);
            vscode.window.showErrorMessage(`MCP 服务器启动失败: ${error.message}`);
            throw error;
        }
    }

    public stopMcpServer() {
        if (mcpServer) {
            mcpServer.stop();
            mcpServer = null;

            vscode.window.showInformationMessage('MCP 服务器已停止');
            console.log('MCP 服务器已停止');

            // 通知 React 应用服务器状态
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'serverStatus',
                    running: false,
                    port: serverPort
                });
            }
        } else {
            vscode.window.showWarningMessage('MCP 服务器未在运行');
        }
    }

    public dispose() {
        if (mcpServer) {
            mcpServer.stop();
            mcpServer = null;
        }
    }

    // 实现反馈收集接口
    public async showFeedbackDialog(workSummary: string): Promise<FeedbackResult> {
        return new Promise((resolve, reject) => {
            if (!this._view) {
                reject(new Error('侧边栏视图未准备好'));
                return;
            }

            // 存储 Promise 的 resolve 和 reject
            this.pendingFeedbackResolve = resolve;
            this.pendingFeedbackReject = reject;

            // 向 React 应用发送显示反馈对话框的消息
            this._view.webview.postMessage({
                type: 'showFeedbackDialog',
                workSummary: workSummary
            });
        });
    }

    // 实现图片选择接口
    public async showImagePickerDialog(): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            if (!this._view) {
                reject(new Error('侧边栏视图未准备好'));
                return;
            }

            // 存储 Promise 的 resolve 和 reject
            this.pendingImageResolve = resolve;
            this.pendingImageReject = reject;

            // 向 React 应用发送显示图片选择对话框的消息
            this._view.webview.postMessage({
                type: 'showImagePickerDialog'
            });
        });
    }

    // 实现确保侧边栏可见的方法
    public async ensureSidebarVisible(): Promise<void> {
        try {
            // 首先确保侧边栏容器是打开的
            await vscode.commands.executeCommand('workbench.view.extension.cursorMaxSidebar');

            // 然后聚焦到我们的视图
            await vscode.commands.executeCommand('cursorMaxSidebarView.focus');

            console.log('侧边栏已自动打开');
        } catch (error) {
            console.warn('自动打开侧边栏失败:', error);
            // 即使失败也不抛出错误，让功能继续执行
        }
    }

    private handleFeedbackSubmit(data: { textFeedback?: string; images?: string[] }) {
        if (this.pendingFeedbackResolve) {
            const feedback: FeedbackResult = {
                text_feedback: data.textFeedback,
                images: data.images ? data.images.map(img => Buffer.from(img, 'base64')) : undefined,
                timestamp: new Date().toISOString()
            };

            this.pendingFeedbackResolve(feedback);
            this.pendingFeedbackResolve = null;
            this.pendingFeedbackReject = null;
        }
    }

    private handleFeedbackCancel() {
        if (this.pendingFeedbackReject) {
            this.pendingFeedbackReject(new Error('用户取消了反馈收集'));
            this.pendingFeedbackResolve = null;
            this.pendingFeedbackReject = null;
        }
    }

    private handleImageSelect(imageData: string) {
        if (this.pendingImageResolve) {
            const buffer = Buffer.from(imageData, 'base64');
            this.pendingImageResolve(buffer);
            this.pendingImageResolve = null;
            this.pendingImageReject = null;
        }
    }

    private handleImageCancel() {
        if (this.pendingImageReject) {
            this.pendingImageReject(new Error('用户取消了图片选择'));
            this.pendingImageResolve = null;
            this.pendingImageReject = null;
        }
    }

    private async handleSelectImageFile() {
        try {
            const uris = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'Images': ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp']
                },
                openLabel: '选择图片'
            });

            if (uris && uris.length > 0 && this.pendingImageResolve) {
                const fs = await import('fs/promises');
                const imageData = await fs.readFile(uris[0].fsPath);
                this.pendingImageResolve(imageData);
                this.pendingImageResolve = null;
                this.pendingImageReject = null;
            }
        } catch (error) {
            if (this.pendingImageReject) {
                this.pendingImageReject(error);
                this.pendingImageResolve = null;
                this.pendingImageReject = null;
            }
        }
    }

    // 添加检查服务器状态的方法
    public isServerRunning(): boolean {
        return mcpServer !== null;
    }

    // 获取当前服务器端口
    public getCurrentServerPort(): number {
        return serverPort;
    }

    // 向 webview 发送消息的方法
    public sendMessage(message: any) {
        if (this._view) {
            // 如果是初始化完成消息，重新检查目录结构
            if (message.type === 'initializationCompleted') {
                const hasValidStructure = this.checkCursorDirectoryStructure();
                console.log('初始化完成，重新检查 .cursor 目录结构:', hasValidStructure);
                
                this._view.webview.postMessage({
                    type: 'cursorDirectoryCheck',
                    hasValidStructure: hasValidStructure
                });
            } else {
                this._view.webview.postMessage(message);
            }
        }
    }
} 