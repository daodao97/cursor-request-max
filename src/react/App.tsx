import React, { useState, useEffect, useRef } from 'react'
import ServerControl from './components/ServerControl'
import LanguageSwitcher from './components/LanguageSwitcher'
import { useLanguage } from './i18n'
import { Button } from '@/components/ui/button'
import {
    PromptInput,
    PromptInputTextarea,
    PromptInputActions,
    PromptInputAction
} from '@/components/ui/prompt-input'
import {
    Message,
    MessageAvatar,
    MessageContent
} from '@/components/ui/message'
import { ArrowUp, Paperclip, Square, X } from "lucide-react"

// VS Code API 接口
interface VSCodeApi {
    postMessage(message: any): void;
    setState(state: any): void;
    getState(): any;
    getImageUri(fileName: string): Promise<string | null>;
}

// 扩展 window 对象
declare global {
    interface Window {
        acquireVsCodeApi?: () => VSCodeApi;
        getImageUri?: (fileName: string) => Promise<string | null>;
    }
}

// 消息发送状态
type MessageStatus = 'sending' | 'sent' | 'failed'

// 消息类型定义
interface ChatMessage {
    id: string
    content: string
    role: 'user' | 'assistant'
    timestamp: Date
    images?: string[]
    status?: MessageStatus
    retryCount?: number
}

const App: React.FC = () => {
    const { t } = useLanguage()
    const [vscode, setVscode] = useState<VSCodeApi | null>(null)
    const [serverStatus, setServerStatus] = useState(false)
    const [isStarting, setIsStarting] = useState(false)
    const [serverPort, setServerPort] = useState<number>(3100)

    // 聊天相关状态
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            content: t.chat.welcomeMessage,
            role: 'assistant',
            timestamp: new Date(),
            status: 'sent'
        }
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [files, setFiles] = useState<File[]>([])
    const [mode, setMode] = useState<'feedback' | null>(null)
    const uploadInputRef = useRef<HTMLInputElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const pendingMessagesRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

    // .cursor 目录结构检查状态
    const [cursorStructureExists, setCursorStructureExists] = useState<boolean | null>(null)
    const [isInitializingStructure, setIsInitializingStructure] = useState(false)

    // 监听 cursorStructureExists 状态变化
    useEffect(() => {
        console.log('cursorStructureExists 状态变化:', cursorStructureExists);
    }, [cursorStructureExists]);

    // 当语言改变时更新欢迎消息
    useEffect(() => {
        setMessages(prev =>
            prev.map((msg, index) =>
                index === 0 && msg.role === 'assistant'
                    ? { ...msg, content: t.chat.welcomeMessage }
                    : msg
            )
        )
    }, [t.chat.welcomeMessage])

    // 自动滚动到底部
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // 清理定时器
    useEffect(() => {
        return () => {
            // 清理所有待处理的定时器
            pendingMessagesRef.current.forEach(timeout => clearTimeout(timeout))
            pendingMessagesRef.current.clear()
        }
    }, [])

    // 更新消息状态
    const updateMessageStatus = (messageId: string, status: MessageStatus) => {
        setMessages(prev =>
            prev.map(msg =>
                msg.id === messageId ? { ...msg, status } : msg
            )
        )

        // 清除超时定时器
        const timeout = pendingMessagesRef.current.get(messageId)
        if (timeout) {
            clearTimeout(timeout)
            pendingMessagesRef.current.delete(messageId)
        }
    }

    // 设置消息发送超时
    const setMessageTimeout = (messageId: string) => {
        const timeout = setTimeout(() => {
            updateMessageStatus(messageId, 'failed')
        }, 10000) // 10秒超时

        pendingMessagesRef.current.set(messageId, timeout)
    }

    // 重试发送消息
    const retryMessage = (message: ChatMessage) => {
        if (!vscode) return

        const retryCount = (message.retryCount || 0) + 1
        const updatedMessage = { ...message, status: 'sending' as MessageStatus, retryCount }

        setMessages(prev =>
            prev.map(msg =>
                msg.id === message.id ? updatedMessage : msg
            )
        )

        // 重新发送消息
        if (message.role === 'user') {
            vscode.postMessage({
                type: 'chatMessage',
                message: message.content,
                messageId: message.id,
                isRetry: true
            })
            setMessageTimeout(message.id)
        }
    }

    useEffect(() => {
        // 确保文档根元素有 dark 类
        document.documentElement.classList.add('dark')

        // 获取 VS Code API
        if (window.acquireVsCodeApi) {
            const api = window.acquireVsCodeApi()
            setVscode(api)

            // 监听来自扩展的消息
            window.addEventListener('message', (event) => {
                const message = event.data
                switch (message.type) {
                    case 'serverStatus':
                        setServerStatus(message.running)
                        setIsStarting(false)
                        // 如果有端口号信息，更新端口号状态
                        if (message.port) {
                            setServerPort(message.port)
                        }
                        break
                    case 'showFeedbackDialog':
                        setMode('feedback')
                        if (message.workSummary) {
                            const feedbackMessage: ChatMessage = {
                                id: Date.now().toString(),
                                content: message.workSummary,
                                role: 'assistant',
                                timestamp: new Date(),
                                status: 'sent'
                            }
                            setMessages(prev => [...prev, feedbackMessage])
                        }
                        break
                    case 'messageConfirmed':
                        // 消息确认收到
                        if (message.messageId) {
                            updateMessageStatus(message.messageId, 'sent')
                        }
                        break
                    case 'messageResponse':
                        // 收到AI回复
                        if (message.messageId) {
                            updateMessageStatus(message.messageId, 'sent')
                        }
                        if (message.response) {
                            const aiResponse: ChatMessage = {
                                id: (Date.now() + Math.random()).toString(),
                                content: message.response,
                                role: 'assistant',
                                timestamp: new Date(),
                                status: 'sent'
                            }
                            setMessages(prev => [...prev, aiResponse])
                        }
                        setIsLoading(false)
                        break
                    case 'cursorDirectoryCheck':
                        // 收到 .cursor 目录结构检查结果
                        console.log('收到 cursorDirectoryCheck 消息:', message.hasValidStructure);
                        setCursorStructureExists(message.hasValidStructure)
                        break
                    case 'reInitialize':
                        // 处理重新初始化请求
                        handleReInitialize()
                        break
                }
            })
        }
    }, [])

    const handleStartServer = () => {
        if (vscode) {
            setIsStarting(true)
            vscode.postMessage({ type: 'startServer' })
        }
    }

    const handleStopServer = () => {
        if (vscode) {
            vscode.postMessage({ type: 'stopServer' })
            setServerStatus(false)
            setIsStarting(false)
        }
    }

    const handleOpenBrowser = () => {
        if (vscode) {
            vscode.postMessage({ type: 'openBrowser' })
        }
    }

    const handleSendMessage = (message: string) => {
        if (vscode) {
            vscode.postMessage({ type: 'chatMessage', message })
        }
    }

    // 初始化 .cursor 目录结构
    const handleInitCursorStructure = () => {
        if (vscode) {
            console.log('开始初始化 .cursor 目录结构');
            setIsInitializingStructure(true)
            vscode.postMessage({ type: 'initCursorStructure' })

            // 监听初始化完成
            setTimeout(() => {
                setIsInitializingStructure(false)
            }, 3000) // 3秒超时
        }
    }

    // 重新初始化插件
    const handleReInitialize = () => {
        if (vscode) {
            console.log('开始重新初始化插件');
            // 重新检查 .cursor 目录结构
            vscode.postMessage({ type: 'reCheckCursorStructure' })
        }
    }

    // 处理消息提交
    const handleSubmit = () => {
        if ((input.trim() || files.length > 0) && mode === 'feedback') {
            setIsLoading(true)

            // 反馈模式处理
            const userMessage: ChatMessage = {
                id: Date.now().toString(),
                content: input.trim(),
                role: 'user',
                timestamp: new Date(),
                images: files.length > 0 ? files.map(f => f.name) : undefined,
                status: 'sending'
            }
            setMessages(prev => [...prev, userMessage])

            // 发送反馈数据给扩展
            if (vscode) {
                const filePromises = files.map(file => {
                    return new Promise<string>((resolve) => {
                        const reader = new FileReader()
                        reader.onload = (e) => {
                            const result = e.target?.result as string
                            const imageData = result.split(',')[1]
                            resolve(imageData)
                        }
                        reader.readAsDataURL(file)
                    })
                })

                Promise.all(filePromises).then(imageDataArray => {
                    vscode.postMessage({
                        type: 'feedbackSubmit',
                        messageId: userMessage.id,
                        data: {
                            textFeedback: input.trim() || undefined,
                            images: imageDataArray.length > 0 ? imageDataArray : undefined
                        }
                    })
                    setMessageTimeout(userMessage.id)
                })
            }

            // 模拟反馈确认回复
            setTimeout(() => {
                updateMessageStatus(userMessage.id, 'sent')
                const aiResponse: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    content: t.chat.feedback.thankYou,
                    role: 'assistant',
                    timestamp: new Date(),
                    status: 'sent'
                }
                setMessages(prev => [...prev, aiResponse])
                setIsLoading(false)
            }, 1000)

            setMode(null) // 重置为空状态
            setInput("")
            setFiles([])
        }
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const newFiles = Array.from(event.target.files)
            setFiles((prev) => [...prev, ...newFiles])
        }
    }

    const handleRemoveFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index))
        if (uploadInputRef?.current) {
            uploadInputRef.current.value = ""
        }
    }

    const handleCancelMode = () => {
        if (vscode && mode === 'feedback') {
            vscode.postMessage({ type: 'feedbackCancel' })
        }
        setMode(null)
        setInput("")
        setFiles([])
    }

    // 获取模式显示文本
    const getModeText = () => {
        if (mode === 'feedback') {
            return t.chat.feedbackMode
        }
        return t.chat.waitingForFeedback
    }

    // 获取占位符文本
    const getPlaceholderText = () => {
        if (mode === 'feedback') {
            return t.chat.placeholder.feedback
        }
        return t.chat.placeholder.disabled
    }

    // 获取按钮文本
    const getButtonText = () => {
        if (isLoading) {
            return t.chat.actions.stopGeneration
        }
        if (mode === 'feedback') {
            return t.chat.actions.submitFeedback
        }
        return t.chat.actions.waitingForFeedback
    }

    // 添加 getImageUri 辅助函数
    const getImageUri = (fileName: string): string => {
        // 返回相对路径作为fallback，或者可以返回默认图片URL
        return `./images/${fileName}`
    }

    return (
        <div className="vscode-container min-h-screen dark:bg-gray-900 bg-gray-100 dark:text-gray-100 text-gray-900 font-sans flex flex-col">
            <div className="flex-shrink-0 p-2">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                        <ServerControl
                            serverStatus={serverStatus}
                            isStarting={isStarting}
                            port={serverPort}
                            onStartServer={handleStartServer}
                            onStopServer={handleStopServer}
                            onOpenBrowser={handleOpenBrowser}
                            onReInitialize={handleReInitialize}
                        />
                    </div>
                </div>

                {/* .cursor 目录结构检查和初始化 */}
                {cursorStructureExists === false && (
                    <div className="mb-2 p-2 rounded border border-gray-300 dark:border-gray-600">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                    ❌ {t.cursor.structure}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {t.cursor.notFound}
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleInitCursorStructure}
                                disabled={isInitializingStructure}
                                className="h-7 px-3 text-xs"
                            >
                                {isInitializingStructure ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-1"></div>
                                        {t.cursor.initializing}
                                    </>
                                ) : (
                                    t.cursor.initialize
                                )}
                            </Button>
                        </div>
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            {t.cursor.createFiles}
                        </div>
                    </div>
                )}
            </div>

            {/* 聊天消息区域 */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto px-3 py-1">
                    <div className="flex flex-col gap-4 max-w-4xl mx-auto">
                        {messages.map((message) => (
                            <Message
                                key={message.id}
                                className={message.role === 'user' ? "justify-end" : "justify-start"}
                            >
                                {message.role === 'assistant' && (
                                    <MessageAvatar
                                        src={getImageUri('icon.jpeg')}
                                        alt="AI"
                                        fallback="🤖"
                                    />
                                )}
                                <div className="flex flex-col max-w-[80%]">
                                    <MessageContent
                                        markdown={message.role === 'assistant'}
                                        className={`${message.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-2xl px-3 py-1.5'
                                            : 'bg-transparent p-0 prose prose-sm dark:prose-invert'
                                            }`}
                                    >
                                        {message.content}
                                    </MessageContent>
                                    {message.images && message.images.length > 0 && (
                                        <div className="mt-1 text-xs text-gray-500">
                                            📎 {message.images.join(', ')}
                                        </div>
                                    )}
                                    {/* 消息状态指示器 */}
                                    {/* {message.role === 'user' && message.status && (
                                        <div className="flex items-center gap-2 mt-1">
                                            {message.status === 'sending' && (
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-500"></div>
                                                    {t.chat.messageStatus.sending}
                                                </div>
                                            )}
                                            {message.status === 'sent' && (
                                                <div className="text-xs text-green-500">{t.chat.messageStatus.sent}</div>
                                            )}
                                            {message.status === 'failed' && (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1 text-xs text-red-500">
                                                        <AlertCircle className="size-3" />
                                                        {t.chat.messageStatus.failed}
                                                        {message.retryCount && message.retryCount > 0 && (
                                                            <span>({t.chat.messageStatus.retryCount} {message.retryCount})</span>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 px-1.5 text-xs"
                                                        onClick={() => retryMessage(message)}
                                                    >
                                                        <RotateCcw className="size-3 mr-1" />
                                                        {t.chat.messageStatus.retry}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )} */}
                                </div>
                                {message.role === 'user' && (
                                    <MessageAvatar
                                        src={getImageUri('user.png')}
                                        alt={t.chat.userAvatar}
                                        fallback="👤"
                                    />
                                )}
                            </Message>
                        ))}
                        {isLoading && (
                            <Message className="justify-start">
                                <MessageAvatar
                                    src={getImageUri('ai.png')}
                                    alt="AI"
                                    fallback="🤖"
                                />
                                <MessageContent className="bg-transparent p-0">
                                    {t.chat.thinking}
                                </MessageContent>
                            </Message>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* PromptInput 输入区域 */}
                <div className="flex-shrink-0 p-3 border-t border-gray-300 dark:border-gray-700">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-gray-500">
                                {getModeText()}
                            </span>
                            {mode === 'feedback' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={handleCancelMode}
                                >
                                    {t.chat.cancelFeedback}
                                </Button>
                            )}
                        </div>
                        <PromptInput
                            value={input}
                            onValueChange={setInput}
                            isLoading={isLoading}
                            onSubmit={handleSubmit}
                            className="w-full"
                            disabled={mode !== 'feedback'}
                        >
                            {files.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pb-1.5">
                                    {files.map((file, index) => (
                                        <div
                                            key={index}
                                            className="bg-secondary flex items-center gap-1.5 rounded-md px-2 py-1 text-xs"
                                        >
                                            <Paperclip className="size-3" />
                                            <span className="max-w-[100px] truncate">{file.name}</span>
                                            <button
                                                onClick={() => handleRemoveFile(index)}
                                                className="hover:bg-secondary/50 rounded-full p-0.5"
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <PromptInputTextarea
                                placeholder={getPlaceholderText()}
                                className="bg-transparent"
                                disabled={mode !== 'feedback'}
                            />

                            <PromptInputActions className="flex items-center justify-between gap-2 pt-1.5">
                                <div className="flex gap-1">
                                    <PromptInputAction tooltip={t.chat.actions.attachFile}>
                                        <label
                                            htmlFor="file-upload"
                                            className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-xl ${
                                                mode === 'feedback' 
                                                    ? 'hover:bg-secondary-foreground/10' 
                                                    : 'opacity-50 cursor-not-allowed'
                                            }`}
                                        >
                                            <input
                                                ref={uploadInputRef}
                                                type="file"
                                                multiple
                                                onChange={handleFileChange}
                                                className="hidden"
                                                id="file-upload"
                                                accept="image/*"
                                                disabled={mode !== 'feedback'}
                                            />
                                            <Paperclip className="text-primary size-4" />
                                        </label>
                                    </PromptInputAction>

                                    {/* <PromptInputAction tooltip={t.chat.actions.selectImage}>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => uploadInputRef.current?.click()}
                                        >
                                            <Camera className="size-4" />
                                        </Button>
                                    </PromptInputAction> */}
                                </div>

                                <PromptInputAction
                                    tooltip={getButtonText()}
                                >
                                    <Button
                                        variant="default"
                                        size="icon"
                                        className="h-7 w-7 rounded-full"
                                        onClick={handleSubmit}
                                        disabled={mode !== 'feedback'}
                                    >
                                        {isLoading ? (
                                            <Square className="size-4 fill-current" />
                                        ) : (
                                            <ArrowUp className="size-4" />
                                        )}
                                    </Button>
                                </PromptInputAction>
                            </PromptInputActions>
                        </PromptInput>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App 