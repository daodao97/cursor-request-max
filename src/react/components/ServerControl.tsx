import React, { useState } from 'react'
import { useLanguage } from '../i18n'
import LanguageSwitcher from './LanguageSwitcher'
import { RefreshCcwIcon, ImageIcon, SettingsIcon } from 'lucide-react'

interface ServerControlProps {
    serverStatus: boolean
    isStarting?: boolean
    port?: number
    onStartServer: () => void
    onStopServer: () => void
    onOpenBrowser: () => void
    onReInitialize?: () => void
}

const ServerControl: React.FC<ServerControlProps> = ({
    serverStatus,
    isStarting = false,
    port = 3100,
    onStartServer,
    onStopServer,
    onOpenBrowser,
    onReInitialize
}) => {
    const { t } = useLanguage()
    const [isReInitializing, setIsReInitializing] = useState(false)
    const [showImageSelector, setShowImageSelector] = useState(false)

    // 测试功能
    const testFeedbackDialog = () => {
        window.postMessage({
            type: 'showFeedbackDialog',
            workSummary: '测试 AI 工作汇报：已完成代码重构，优化了性能和用户体验。'
        }, '*')
    }

    const testImagePicker = () => {
        window.postMessage({
            type: 'showImagePickerDialog'
        }, '*')
    }

    // 选择头像
    const selectAvatar = (type: 'user' | 'ai', imagePath?: string) => {
        window.postMessage({
            type: 'selectAvatar',
            avatarType: type,
            imagePath: imagePath
        }, '*')
    }

    // 示例：动态获取图片URI
    const loadCustomImage = async (fileName: string) => {
        if (window.getImageUri) {
            try {
                const uri = await window.getImageUri(fileName);
                if (uri) {
                    console.log(`成功获取图片URI: ${fileName} -> ${uri}`);
                    return uri;
                } else {
                    console.warn(`图片不存在: ${fileName}`);
                    return null;
                }
            } catch (error) {
                console.error(`获取图片URI失败: ${fileName}`, error);
                return null;
            }
        }
        return null;
    };

    // 处理重新初始化点击
    const handleReInitialize = async () => {
        if (isReInitializing) return // 防止重复点击

        setIsReInitializing(true)
        
        try {
            // 发送重新初始化消息
            window.postMessage({
                type: 'reInitialize'
            }, '*')

            // 如果有外部回调，也调用它
            if (onReInitialize) {
                await onReInitialize()
            }

            // 延迟重置状态，确保动画能看到
            setTimeout(() => {
                setIsReInitializing(false)
            }, 1500)
        } catch (error) {
            console.error('重新初始化失败:', error)
            setIsReInitializing(false)
        }
    }

    // 确定显示状态
    const getStatusDisplay = () => {
        if (isReInitializing) {
            return {
                text: '重新初始化中...',
                dotClass: 'bg-blue-500 animate-pulse'
            }
        } else if (isStarting) {
            return {
                text: t.status.starting,
                dotClass: 'bg-yellow-500 animate-pulse'
            }
        } else if (serverStatus) {
            return {
                text: t.status.running,
                dotClass: 'bg-green-500'
            }
        } else {
            return {
                text: t.status.stopped,
                dotClass: 'bg-gray-400'
            }
        }
    }

    const status = getStatusDisplay()

    return (
        <div className="p-2 space-y-1">
            {/* 第一行：标题和运行状态 */}
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1 text-sm font-medium dark:text-gray-100 text-gray-900">
                    {t.title}
                    <div className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                </h3>
                <div className="flex items-center space-x-1.5">
                    {/* 图片选择按钮 */}
                    <div className="relative">
                        {/* 图片选择下拉菜单 */}
                        {showImageSelector && (
                            <div className="absolute top-6 right-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 z-10 min-w-48">
                                <div className="text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">选择头像</div>
                                
                                {/* AI 头像选项 */}
                                <div className="mb-2">
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">AI 头像</div>
                                    <div className="flex gap-1 flex-wrap">
                                        <button 
                                            className="w-8 h-8 text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                            onClick={() => selectAvatar('ai')}
                                            title="默认 AI"
                                        >
                                            🤖
                                        </button>
                                        <button 
                                            className="w-8 h-8 text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                            onClick={() => selectAvatar('ai')}
                                            title="助手"
                                        >
                                            🚀
                                        </button>
                                        <button 
                                            className="w-8 h-8 text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                            onClick={() => selectAvatar('ai')}
                                            title="智能"
                                        >
                                            🧠
                                        </button>
                                    </div>
                                </div>
                                
                                {/* 用户头像选项 */}
                                <div className="mb-2">
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">用户头像</div>
                                    <div className="flex gap-1 flex-wrap">
                                        <button 
                                            className="w-8 h-8 text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                            onClick={() => selectAvatar('user')}
                                            title="默认用户"
                                        >
                                            👤
                                        </button>
                                        <button 
                                            className="w-8 h-8 text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                            onClick={() => selectAvatar('user')}
                                            title="开发者"
                                        >
                                            👨‍💻
                                        </button>
                                        <button 
                                            className="w-8 h-8 text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                            onClick={() => selectAvatar('user')}
                                            title="女开发者"
                                        >
                                            👩‍💻
                                        </button>
                                    </div>
                                </div>
                                
                                {/* 自定义图片选项 */}
                                <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                                    <button 
                                        className="w-full text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded px-2 py-1"
                                        onClick={testImagePicker}
                                    >
                                        选择自定义图片
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* refresh button */}
                    <button 
                        className={`text-xs dark:text-gray-300 text-gray-600 transition-transform duration-300 hover:text-blue-500 dark:hover:text-blue-400 ${
                            isReInitializing ? 'animate-spin' : 'hover:rotate-180'
                        }`}
                        onClick={handleReInitialize}
                        disabled={isReInitializing}
                        title={isReInitializing ? '重新初始化中...' : '重新初始化插件'}
                    >
                        <RefreshCcwIcon className="w-4 h-4" />
                    </button>
                   
                    <LanguageSwitcher />
                </div>
            </div>

            {/* 点击外部关闭下拉菜单 */}
            {showImageSelector && (
                <div 
                    className="fixed inset-0 z-5" 
                    onClick={() => setShowImageSelector(false)}
                />
            )}

            {/* 第二行：MCP 服务器链接信息 */}
            {/* <div className="text-xs dark:text-gray-400 text-gray-500">
                {isReInitializing ? (
                    <span>正在重新初始化插件...</span>
                ) : serverStatus ? (
                    <span>http://localhost:{port}</span>
                ) : isStarting ? (
                    <span>{t.startingServer}</span>
                ) : (
                    t.serverNotStarted
                )}
            </div> */}
        </div>
    )
}

export default ServerControl 