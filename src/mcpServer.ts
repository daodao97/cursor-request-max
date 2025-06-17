import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import * as vscode from 'vscode';
import express from 'express';
import * as path from 'path';
import * as fs from 'fs/promises';
import { z } from 'zod';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ReadResourceRequestSchema,
    ListResourcesRequestSchema,
    GetPromptRequestSchema,
    ListPromptsRequestSchema,
    isInitializeRequest
} from '@modelcontextprotocol/sdk/types.js';

export interface FeedbackResult {
    text_feedback?: string;
    images?: Buffer[];
    timestamp: string;
}

// 添加侧边栏提供者接口
export interface ISidebarProvider {
    showFeedbackDialog(workSummary: string): Promise<FeedbackResult>;
    ensureSidebarVisible(): Promise<void>;
}

export class FeedbackMcpServer {
    private server: Server;
    private expressApp: express.Application;
    private transports: Record<string, SSEServerTransport> = {};
    private httpServer: any;
    private sidebarProvider: ISidebarProvider | null = null;

    constructor() {
        this.server = new Server({
            name: "交互式反馈收集器",
            version: "1.0.0",
        }, {
            capabilities: {
                tools: {}
            }
        });

        this.expressApp = express();
        this.setupTools();
        this.setupExpress();
    }

    // 设置侧边栏提供者
    public setSidebarProvider(provider: ISidebarProvider) {
        this.sidebarProvider = provider;
    }

    private setupTools() {
        // 列出可用工具
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "collect_feedback",
                        description: "收集用户反馈的交互式工具。AI可以汇报完成的工作，用户可以提供文字和/或图片反馈。",
                        inputSchema: {
                            type: "object",
                            properties: {
                                work_summary: {
                                    type: "string",
                                    description: "AI完成的工作内容汇报",
                                    default: ""
                                },
                                timeout_seconds: {
                                    type: "number",
                                    description: "对话框超时时间（秒），设置为0表示永不超时，默认为0（永不超时）",
                                    default: 0
                                }
                            }
                        }
                    },
                    {
                        name: "get_image_info",
                        description: "获取指定路径图片的信息（尺寸、格式等）",
                        inputSchema: {
                            type: "object",
                            properties: {
                                image_path: {
                                    type: "string",
                                    description: "图片文件路径"
                                }
                            },
                            required: ["image_path"]
                        }
                    }
                ]
            };
        });

        // 工具调用处理器
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            console.log('CallToolRequestSchema', request);

            switch (name) {
                case 'collect_feedback': {
                    const { work_summary = "", timeout_seconds = 0 } = (args as any) || {};

                    try {
                        const feedback = await this.showFeedbackDialog(work_summary, timeout_seconds);

                        let results = [];

                        if (feedback.text_feedback) {
                            results.push({
                                type: "text" as const,
                                text: `用户文字反馈：${feedback.text_feedback}\n提交时间：${feedback.timestamp}`
                            });
                        }

                        if (feedback.images && feedback.images.length > 0) {
                            results.push({
                                type: "text" as const,
                                text: `用户提供了 ${feedback.images.length} 张图片反馈`
                            });

                            feedback.images.forEach((imageData: Buffer) => {
                                results.push({
                                    type: "image" as const,
                                    data: imageData.toString('base64'),
                                    mimeType: "image/png"
                                });
                            });
                        }

                        return { content: results };

                    } catch (error) {
                        console.error('反馈收集失败:', error);
                        return {
                            content: [{
                                type: "text" as const,
                                text: `反馈收集失败: ${error}`
                            }]
                        };
                    }
                }

                case 'get_image_info': {
                    const { image_path } = (args as any) || {};

                    try {
                        const info = await this.getImageInfo(image_path as string);
                        return {
                            content: [{
                                type: "text" as const,
                                text: info
                            }]
                        };
                    } catch (error) {
                        console.error('获取图片信息失败:', error);
                        return {
                            content: [{
                                type: "text" as const,
                                text: `获取图片信息失败: ${error}`
                            }]
                        };
                    }
                }

                case 'show_message': {
                    const { message, type = "info" } = (args as any) || {};

                    try {
                        // 如果有侧边栏提供者，先确保侧边栏可见
                        if (this.sidebarProvider) {
                            try {
                                await this.sidebarProvider.ensureSidebarVisible();
                            } catch (error) {
                                console.warn('自动打开侧边栏失败:', error);
                                // 继续执行，不因为侧边栏问题而中断消息显示
                            }
                        }

                        switch (type) {
                            case "warning":
                                vscode.window.showWarningMessage(message as string);
                                break;
                            case "error":
                                vscode.window.showErrorMessage(message as string);
                                break;
                            default:
                                vscode.window.showInformationMessage(message as string);
                        }

                        return {
                            content: [{
                                type: "text" as const,
                                text: `已显示${type}消息: ${message}`
                            }]
                        };
                    } catch (error) {
                        return {
                            content: [{
                                type: "text" as const,
                                text: `显示消息失败: ${error}`
                            }]
                        };
                    }
                }

                default:
                    return {
                        content: [{
                            type: "text" as const,
                            text: `未知工具: ${name}`
                        }]
                    };
            }
        });
    }

    private setupExpress() {
        this.expressApp.use(express.json());

        // CORS 设置
        this.expressApp.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
                return;
            }
            next();
        });

        // SSE 端点 - 处理 GET 请求以建立 SSE 连接
        this.expressApp.get('/sse', async (req: express.Request, res: express.Response) => {
            try {
                console.log(`SSE connection request received`);

                // 创建 SSE 传输
                const transport = new SSEServerTransport('/messages', res);
                this.transports[transport.sessionId] = transport;

                // 连接服务器
                await this.server.connect(transport);

                // 清理连接
                res.on("close", () => {
                    console.log(`SSE connection closed: ${transport.sessionId}`);
                    delete this.transports[transport.sessionId];
                });

                console.log(`SSE transport created with session ID: ${transport.sessionId}`);

            } catch (error: any) {
                console.error('SSE connection error:', error);
                if (!res.headersSent) {
                    res.status(500).json({
                        jsonrpc: '2.0',
                        error: {
                            code: -32603,
                            message: 'Internal server error',
                        },
                        id: null,
                    });
                }
            }
        });

        // 消息端点 - 处理 POST 请求
        this.expressApp.post('/messages', async (req: express.Request, res: express.Response) => {
            try {
                console.log(`Message POST request received`);

                const sessionId = req.query.sessionId as string;
                const transport = this.transports[sessionId];

                if (transport) {
                    await transport.handlePostMessage(req, res, req.body);
                    console.log(`Message handled for session: ${sessionId}`);
                } else {
                    console.error(`No transport found for sessionId: ${sessionId}`);
                    res.status(400).send('No transport found for sessionId');
                }

            } catch (error: any) {
                console.error('Message POST error:', error);
                if (!res.headersSent) {
                    res.status(500).json({
                        jsonrpc: '2.0',
                        error: {
                            code: -32603,
                            message: 'Internal server error',
                        },
                        id: null,
                    });
                }
            }
        });
    }

    private async showFeedbackDialog(workSummary: string, timeoutSeconds: number): Promise<FeedbackResult> {
        // 优先使用侧边栏
        if (this.sidebarProvider) {
            try {
                await this.sidebarProvider.ensureSidebarVisible();
                return await this.sidebarProvider.showFeedbackDialog(workSummary);
            } catch (error) {
                // 如果侧边栏失败，回退到原来的方式
                console.warn('侧边栏反馈收集失败，回退到 webview 面板:', error);
            }
        }
        throw new Error('侧边栏反馈收集失败');
    }

    private async getImageInfo(imagePath: string): Promise<string> {
        try {
            const stats = await fs.stat(imagePath);

            // 简单的图片信息检测
            const info = {
                "文件名": path.basename(imagePath),
                "文件大小": `${(stats.size / 1024).toFixed(1)} KB`,
                "修改时间": stats.mtime.toLocaleString('zh-CN'),
                "MIME类型": this.getMimeType(imagePath)
            };

            return Object.entries(info).map(([k, v]) => `${k}: ${v}`).join('\n');
        } catch (error) {
            throw new Error(`获取图片信息失败: ${error}`);
        }
    }

    private getMimeType(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.webp': 'image/webp'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    public async start(port: number = 3100): Promise<number> {
        return new Promise((resolve, reject) => {
            this.httpServer = this.expressApp.listen(port, () => {
                console.log(`MCP 服务器运行在 http://localhost:${port}`);
                console.log(`SSE MCP 端点: http://localhost:${port}/sse`);
                console.log(`消息端点: http://localhost:${port}/messages`);
                resolve(port); // 返回实际使用的端口
            });

            this.httpServer.on('error', (err: any) => {
                if (err.code === 'EADDRINUSE') {
                    this.start(port + 1).then(resolve).catch(reject);
                } else {
                    reject(err);
                }
            });
        });
    }

    public stop(): void {
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
        }

        // 清理所有传输层
        Object.values(this.transports).forEach(transport => {
            try {
                // SSE transport cleanup will be handled by connection close events
            } catch (error) {
                console.error('清理传输层失败:', error);
            }
        });
        this.transports = {};
    }
} 