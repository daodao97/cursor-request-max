// 添加新语言示例 - 日语 (Japanese)
// 这个文件展示了如何添加新的语言支持

import { LanguageConfig, Translations } from './index'

// 1. 添加新的语言配置
export const japaneseLanguageConfig: LanguageConfig = {
    code: 'ja',
    name: '日本語',
    flag: '🇯🇵'
}

// 2. 添加对应的翻译内容
export const japaneseTranslations: Translations = {
    title: 'Cursor Request Max',
    status: {
        running: '実行中',
        stopped: '停止中',
        starting: '開始中'
    },
    serverNotStarted: 'MCPサーバーが開始されていません',
    startingServer: 'サーバーを開始しています...',
    language: '言語',
    selectLanguage: '言語を選択',
    chat: {
        welcomeMessage: 'Cursor Chat Modeを使用する際、各クイックリクエストの可能性を最大限に引き出すお手伝いをします',
        thinking: '考えています...',
        chatMode: 'チャットモード',
        feedbackMode: 'フィードバックモード',
        imagePickerMode: '画像選択',
        waitingForFeedback: 'フィードバックリクエストを待機中',
        cancelFeedback: 'フィードバックをキャンセル',
        cancelSelection: '選択をキャンセル',
        placeholder: {
            chat: 'ここに質問を入力してください...',
            feedback: 'ご意見、提案、フィードバックをお聞かせください...',
            imagePicker: '画像を選択してください...',
            disabled: 'フィードバックモードの有効化を待機中...'
        },
        actions: {
            attachFile: 'ファイルを添付',
            selectImage: '画像を選択',
            stopGeneration: '生成を停止',
            submitFeedback: 'フィードバックを送信',
            sendImage: '画像を送信',
            sendMessage: 'メッセージを送信',
            waitingForFeedback: 'フィードバック待機中'
        },
        userAvatar: 'ユーザー',
        messageStatus: {
            sending: '送信中...',
            sent: '✓ 送信済み',
            failed: '送信失敗',
            retry: '再試行',
            retryCount: '再試行'
        },
        feedback: {
            thankYou: 'フィードバックをありがとうございます！サービス改善のためのご提案を真摯に検討いたします。'
        }
    },
    cursor: {
        structure: '.cursor ディレクトリ構造',
        notFound: '見つかりません',
        exists: '既に存在します',
        initialize: '初期化',
        initializing: '初期化中...',
        createFiles: '作成予定: .cursor/mcp.json と .cursor/rules/cursor-requext-max.mdc',
        configMissing: '設定が不足'
    }
}

// 3. 使用方法:
// 
// 主要配置ファイル (src/react/i18n/index.tsx) で:
// 
// export const supportedLanguages: LanguageConfig[] = [
//     { code: 'en', name: 'English', flag: '🇺🇸' },
//     { code: 'zh', name: '中文', flag: '🇨🇳' },
//     japaneseLanguageConfig  // 新しい言語を追加
// ];
// 
// export const translations: Record<string, Translations> = {
//     en: { /* 英語の翻訳 */ },
//     zh: { /* 中国語の翻訳 */ },
//     ja: japaneseTranslations  // 新しい翻訳を追加
// };

// 4. 韓国語の例
export const koreanLanguageConfig: LanguageConfig = {
    code: 'ko',
    name: '한국어',
    flag: '🇰🇷'
}

export const koreanTranslations: Translations = {
    title: 'Cursor Request Max',
    status: {
        running: '실행 중',
        stopped: '중지됨',
        starting: '시작 중'
    },
    serverNotStarted: 'MCP 서버가 시작되지 않음',
    startingServer: '서버를 시작하는 중...',
    language: '언어',
    selectLanguage: '언어 선택',
    chat: {
        welcomeMessage: 'Cursor Chat Mode를 사용하실 때, 각 빠른 요청의 잠재력을 최대한 활용할 수 있도록 도와드리겠습니다',
        thinking: '생각하는 중...',
        chatMode: '채팅 모드',
        feedbackMode: '피드백 모드',
        imagePickerMode: '이미지 선택',
        waitingForFeedback: '피드백 요청 대기 중',
        cancelFeedback: '피드백 취소',
        cancelSelection: '선택 취소',
        placeholder: {
            chat: '여기에 질문을 입력하세요...',
            feedback: '생각, 제안 또는 피드백을 공유해 주세요...',
            imagePicker: '이미지를 선택하세요...',
            disabled: '피드백 모드 활성화 대기 중...'
        },
        actions: {
            attachFile: '파일 첨부',
            selectImage: '이미지 선택',
            stopGeneration: '생성 중지',
            submitFeedback: '피드백 제출',
            sendImage: '이미지 전송',
            sendMessage: '메시지 전송',
            waitingForFeedback: '피드백 대기 중'
        },
        userAvatar: '사용자',
        messageStatus: {
            sending: '전송 중...',
            sent: '✓ 전송됨',
            failed: '전송 실패',
            retry: '재시도',
            retryCount: '재시도'
        },
        feedback: {
            thankYou: '피드백을 주셔서 감사합니다! 서비스 개선을 위한 제안을 신중히 검토하겠습니다.'
        }
    },
    cursor: {
        structure: '.cursor 디렉토리 구조',
        notFound: '찾을 수 없음',
        exists: '이미 존재함',
        initialize: '초기화',
        initializing: '초기화 중...',
        createFiles: '생성 예정: .cursor/mcp.json 및 .cursor/rules/cursor-requext-max.mdc',
        configMissing: '설정 누락'
    }
} 