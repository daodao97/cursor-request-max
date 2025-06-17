import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { koreanTranslations, koreanLanguageConfig, japaneseLanguageConfig, japaneseTranslations } from './langs';


export interface LanguageConfig {
    code: string;
    name: string;
    flag: string;
}

export const supportedLanguages: LanguageConfig[] = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    koreanLanguageConfig,
    japaneseLanguageConfig,
];

export interface Translations {
    title: string;
    status: {
        running: string;
        stopped: string;
        starting: string;
    };
    serverNotStarted: string;
    startingServer: string;
    language: string;
    selectLanguage: string;
    // App.tsx 相关翻译
    chat: {
        welcomeMessage: string;
        thinking: string;
        chatMode: string;
        feedbackMode: string;
        imagePickerMode: string;
        waitingForFeedback: string;
        cancelFeedback: string;
        cancelSelection: string;
        placeholder: {
            chat: string;
            feedback: string;
            imagePicker: string;
            disabled: string;
        };
        actions: {
            attachFile: string;
            selectImage: string;
            stopGeneration: string;
            submitFeedback: string;
            sendImage: string;
            sendMessage: string;
            waitingForFeedback: string;
        };
        userAvatar: string;
        messageStatus: {
            sending: string;
            sent: string;
            failed: string;
            retry: string;
            retryCount: string;
        };
        feedback: {
            thankYou: string;
        };
    };
    cursor: {
        structure: string;
        notFound: string;
        exists: string;
        initialize: string;
        initializing: string;
        createFiles: string;
        configMissing: string;
    };
}

export const translations: Record<string, Translations> = {
    en: {
        title: 'Cursor Request Max',
        status: {
            running: 'Running',
            stopped: 'Stopped',
            starting: 'Starting'
        },
        serverNotStarted: 'MCP Server not started',
        startingServer: 'Starting server...',
        language: 'Language',
        selectLanguage: 'Select Language',
        chat: {
            welcomeMessage: 'When you use Cursor Chat Mode, I will help you maximize the potential of each quick request',
            thinking: 'Thinking...',
            chatMode: 'Chat Mode',
            feedbackMode: 'Feedback Mode',
            imagePickerMode: 'Image Picker',
            waitingForFeedback: 'Waiting for Feedback Request',
            cancelFeedback: 'Cancel Feedback',
            cancelSelection: 'Cancel Selection',
            placeholder: {
                chat: 'Enter your question here...',
                feedback: 'Please share your thoughts, suggestions or any feedback...',
                imagePicker: 'Select an image...',
                disabled: 'Waiting for feedback mode to be activated...'
            },
            actions: {
                attachFile: 'Attach File',
                selectImage: 'Select Image',
                stopGeneration: 'Stop Generation',
                submitFeedback: 'Submit Feedback',
                sendImage: 'Send Image',
                sendMessage: 'Send Message',
                waitingForFeedback: 'Waiting for Feedback'
            },
            userAvatar: 'User',
            messageStatus: {
                sending: 'Sending...',
                sent: '✓ Sent',
                failed: 'Send failed',
                retry: 'Retry',
                retryCount: 'retry'
            },
            feedback: {
                thankYou: 'Thank you for your feedback! We will carefully consider your suggestions to improve our service.'
            }
        },
        cursor: {
            structure: '.cursor Directory Structure',
            notFound: 'Not Found',
            exists: 'Already Exists',
            initialize: 'Initialize',
            initializing: 'Initializing...',
            createFiles: 'Will create: .cursor/mcp.json and .cursor/rules/cursor-requext-max.mdc',
            configMissing: 'Config Missing'
        }
    },
    zh: {
        title: 'Cursor Request Max',
        status: {
            running: '运行中',
            stopped: '已停止',
            starting: '启动中'
        },
        serverNotStarted: 'MCP 服务器未启动',
        startingServer: '正在启动服务器...',
        language: '语言',
        selectLanguage: '选择语言',
        chat: {
            welcomeMessage: '当您在使用 Cursor Chat Mode 时, 我会帮您尽可能榨干每次快速请求的潜力',
            thinking: '正在思考中...',
            chatMode: '聊天模式',
            feedbackMode: '反馈模式',
            imagePickerMode: '图片选择',
            waitingForFeedback: '等待反馈请求',
            cancelFeedback: '取消反馈',
            cancelSelection: '取消选择',
            placeholder: {
                chat: '在这里输入你的问题...',
                feedback: '请分享您的想法、建议或任何反馈意见...',
                imagePicker: '选择一张图片...',
                disabled: '等待反馈模式激活...'
            },
            actions: {
                attachFile: '附加文件',
                selectImage: '选择图片',
                stopGeneration: '停止生成',
                submitFeedback: '提交反馈',
                sendImage: '发送图片',
                sendMessage: '发送消息',
                waitingForFeedback: '等待反馈'
            },
            userAvatar: '用户',
            messageStatus: {
                sending: '发送中...',
                sent: '✓ 已发送',
                failed: '发送失败',
                retry: '重试',
                retryCount: '重试'
            },
            feedback: {
                thankYou: '感谢您的反馈！我们会认真考虑您的建议来改进服务。'
            }
        },
        cursor: {
            structure: '.cursor 目录结构',
            notFound: '未找到',
            exists: '已存在',
            initialize: '初始化',
            initializing: '初始化中...',
            createFiles: '将创建：.cursor/mcp.json 和 .cursor/rules/cursor-requext-max.mdc',
            configMissing: '配置缺失'
        }
    },
    ko: koreanTranslations,
    ja: japaneseTranslations,
};

// 语言上下文接口
interface LanguageContextType {
    currentLanguage: string;
    changeLanguage: (languageCode: string) => void;
    t: Translations;
    supportedLanguages: LanguageConfig[];
}

// 创建语言上下文
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 语言提供者组件
interface LanguageProviderProps {
    children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
    const [currentLanguage, setCurrentLanguage] = useState<string>('zh'); // 默认中文

    useEffect(() => {
        // 从 localStorage 读取保存的语言设置
        const savedLanguage = localStorage.getItem('cursor-max-language');
        if (savedLanguage && translations[savedLanguage]) {
            setCurrentLanguage(savedLanguage);
        }
    }, []);

    const changeLanguage = (languageCode: string) => {
        if (translations[languageCode]) {
            setCurrentLanguage(languageCode);
            localStorage.setItem('cursor-max-language', languageCode);
            console.log('Language changed to:', languageCode); // 调试日志
        }
    };

    const t = translations[currentLanguage];

    const value: LanguageContextType = {
        currentLanguage,
        changeLanguage,
        t,
        supportedLanguages
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

// 使用语言上下文的 Hook
export function useLanguage(): LanguageContextType {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
} 