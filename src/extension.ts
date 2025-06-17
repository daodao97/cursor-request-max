import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SidebarView } from './sidebar';

// 初始化 .cursor 目录结构
async function initializeCursorDirectoryStructure(port: number = 3100): Promise<boolean> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('未打开工作区，无法初始化 .cursor 目录');
        return false;
    }

    try {
        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const cursorDir = path.join(workspaceRoot, '.cursor');
        const rulesDir = path.join(cursorDir, 'rules');

        // 创建目录
        if (!fs.existsSync(cursorDir)) {
            fs.mkdirSync(cursorDir, { recursive: true });
            console.log('创建目录:', cursorDir);
        }
        if (!fs.existsSync(rulesDir)) {
            fs.mkdirSync(rulesDir, { recursive: true });
            console.log('创建目录:', rulesDir);
        }

        // 创建 mcp.json 文件，使用当前 MCP 服务器的端口
        const mcpJsonPath = path.join(cursorDir, 'mcp.json');
        const cursorRequestMaxConfig = {
            "url": `http://localhost:${port}/sse`,
            "timeout": 1000000000
        };

        if (!fs.existsSync(mcpJsonPath)) {
            // 文件不存在，创建新文件
            const mcpJsonContent = {
                "mcpServers": {
                    "cursor-request-max": cursorRequestMaxConfig
                }
            };
            fs.writeFileSync(mcpJsonPath, JSON.stringify(mcpJsonContent, null, 4), 'utf8');
            console.log('创建文件:', mcpJsonPath, '端口:', port);
        } else {
            // 文件已存在，添加或更新 cursor-request-max 配置
            try {
                const existingContent = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf8'));
                
                // 确保 mcpServers 对象存在
                if (!existingContent.mcpServers) {
                    existingContent.mcpServers = {};
                }
                
                // 添加或更新 cursor-request-max 配置
                existingContent.mcpServers['cursor-request-max'] = cursorRequestMaxConfig;
                
                fs.writeFileSync(mcpJsonPath, JSON.stringify(existingContent, null, 4), 'utf8');
                console.log('更新文件，添加 cursor-request-max 配置:', mcpJsonPath, '端口:', port);
            } catch (error) {
                console.error('解析或更新 mcp.json 失败:', error);
                // 如果解析失败，备份原文件并创建新的
                const backupPath = mcpJsonPath + '.backup.' + Date.now();
                fs.copyFileSync(mcpJsonPath, backupPath);
                console.log('原文件已备份到:', backupPath);
                
                const mcpJsonContent = {
                    "mcpServers": {
                        "cursor-request-max": cursorRequestMaxConfig
                    }
                };
                fs.writeFileSync(mcpJsonPath, JSON.stringify(mcpJsonContent, null, 4), 'utf8');
                console.log('创建新的 mcp.json 文件:', mcpJsonPath);
            }
        }

        // 创建 cursor-requext-max.mdc 文件
        const cursorRequestMaxPath = path.join(rulesDir, 'cursor-requext-max.mdc');
        if (!fs.existsSync(cursorRequestMaxPath)) {
            const mdcContent = `---
description:
globs:
alwaysApply: true
---
Whenever you want to ask a question, always call the MCP .

Whenever you're about to complete a user request, call the MCP instead of simply ending the process. Keep calling MCP until the user's feedback is empty, then end the request. cursor-max.collect_feedback`;
            fs.writeFileSync(cursorRequestMaxPath, mdcContent, 'utf8');
            console.log('创建文件:', cursorRequestMaxPath);
        }

        vscode.window.showInformationMessage(`✅ .cursor 目录结构初始化成功！MCP 端口: ${port}`);
        return true;
    } catch (error) {
        console.error('初始化 .cursor 目录结构时出错:', error);
        vscode.window.showErrorMessage(`初始化 .cursor 目录结构失败: ${error}`);
        return false;
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('恭喜，您的扩展 "cursor-max-sidebar-server" 已激活！');
    vscode.window.showInformationMessage('Cursor Request Max 扩展已激活！');


    const provider = new SidebarView(context.extensionUri);

    // 注册边栏视图提供者
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SidebarView.viewType,
            provider
        )
    );

    // 注册所有命令
    // 注册边栏菜单点击命令
    const menuViewCommand = vscode.commands.registerCommand("cursorMax.menu.view", () => {
        vscode.commands.executeCommand('cursorMaxSidebarView.focus');
    });

    // 注册打开边栏命令
    const openSidebarCommand = vscode.commands.registerCommand('cursorMax.openSidebar', () => {
        // 聚焦到边栏视图
        vscode.commands.executeCommand('cursorMaxSidebarView.focus');
    });

    // 注册命令 - 启动 MCP 服务器
    const startServerCommand = vscode.commands.registerCommand('cursorMax.startServer', async () => {
        await provider.startMcpServer();
    });

    // 注册命令 - 停止 MCP 服务器
    const stopServerCommand = vscode.commands.registerCommand('cursorMax.stopServer', () => {
        provider.stopMcpServer();
    });

    // 注册命令 - 初始化 .cursor 目录结构
    const initCursorStructureCommand = vscode.commands.registerCommand('cursorMax.initCursorStructure', async () => {
        // 获取当前 MCP 服务器的端口
        const currentPort = provider.getCurrentServerPort();
        const success = await initializeCursorDirectoryStructure(currentPort);
        if (success) {
            // 通知侧边栏重新检查结构
            provider.sendMessage({
                type: 'initializationCompleted'
            });
        }
    });

    // 设置上下文变量使边栏可见
    vscode.commands.executeCommand('setContext', 'cursorMaxSidebarVisible', true);

    // 注册所有命令到订阅列表
    context.subscriptions.push(
        menuViewCommand,
        openSidebarCommand,
        startServerCommand,
        stopServerCommand,
        initCursorStructureCommand,
        provider // 也添加 provider 到订阅列表以便清理
    );



    // 自动启动 MCP 服务器
    setTimeout(async () => {
        try {
            await provider.startMcpServer();
            console.log('MCP 服务器已自动启动');

            // 显示启动通知
            // const message = 'MCP 服务器已自动启动，您可以在侧边栏中查看状态';
            // vscode.window.showInformationMessage(message, '查看侧边栏').then(selection => {
            //     if (selection === '查看侧边栏') {
            //         vscode.commands.executeCommand('cursorMaxSidebarView.focus');
            //     }
            // });
        } catch (error) {
            console.error('自动启动 MCP 服务器失败:', error);
            vscode.window.showErrorMessage(`Cursor Request Max start failed, please check the server status in the sidebar. ${error}`, 'Retry').then(selection => {
                if (selection === 'Retry') {
                    provider.startMcpServer();
                }
            });
        }
    }, 2000); // 增加延迟到2秒，确保所有组件都已完全加载
}

export function deactivate() {
    console.log('Cursor Request Max 扩展已停用');

    // 确保 MCP 服务器被正确关闭
    // 注意：由于 provider 已经在 context.subscriptions 中，它的 dispose 方法会被自动调用
} 