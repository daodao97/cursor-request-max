#!/bin/bash

set -e  # 遇到错误时立即退出

echo "🚀 开始构建和安装 Cursor Request Max 扩展..."
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null
then
    echo "❌ 错误：未找到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null
then
    echo "❌ 错误：未找到 npm，请先安装 npm"
    exit 1
fi

echo "📦 安装项目依赖..."
npm install

# 检查是否安装了 vsce
if ! command -v vsce &> /dev/null
then
    echo "🔧 vsce 未安装，正在安装..."
    npm install -g @vscode/vsce
fi

echo ""
echo "🔨 构建扩展..."

# 使用新的 esbuild 构建流程
echo "  - 编译 TypeScript (使用 esbuild)..."
npm run compile

echo "  - 构建 React 组件..."
npm run build:react

echo "  - 打包扩展..."
npm run package

echo ""

# 查找生成的 .vsix 文件
VSIX_FILE=$(ls *.vsix 2>/dev/null | head -n 1)

if [ -z "$VSIX_FILE" ]; then
    echo "❌ 错误：未找到 .vsix 文件，构建可能失败"
    exit 1
fi

echo "✅ 扩展打包成功！"
echo "📦 扩展文件: $VSIX_FILE"

# 获取文件大小
if command -v du &> /dev/null; then
    FILE_SIZE=$(du -h "$VSIX_FILE" | cut -f1)
    echo "📏 文件大小: $FILE_SIZE"
fi

echo ""
echo "🔄 准备安装扩展到 VS Code..."
echo ""

# 提供选择
echo "请选择操作："
echo "1) 安装到 VS Code"
echo "2) 仅构建，不安装"
echo "3) 退出"
echo ""

read -p "请输入选择 (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🗑️  卸载旧版本（如果存在）..."
        code --uninstall-extension daodao97.cursor-request-max 2>/dev/null || true
        
        echo "⬇️  安装新版本..."
        if code --install-extension "$VSIX_FILE"; then
            echo ""
            echo "🎉 Cursor Request Max 扩展安装完成！"
            echo ""
            echo "📋 后续步骤："
            echo "1. 重启 VS Code 以启用扩展"
            echo "2. 扩展将在启动时自动激活并启动 MCP 服务器"
            echo "3. 在侧边栏中查看 Cursor Request Max 面板"
            echo "4. 配置 Cursor 的 MCP 连接（默认端口: 3100）"
        else
            echo "❌ 扩展安装失败"
            exit 1
        fi
        ;;
    2)
        echo "✅ 构建完成，扩展文件: $VSIX_FILE"
        echo "💡 如需手动安装，请运行: code --install-extension \"$VSIX_FILE\""
        ;;
    3)
        echo "👋 退出安装程序"
        exit 0
        ;;
    *)
        echo "❌ 无效选择，退出"
        exit 1
        ;;
esac

echo ""
echo "🔗 项目地址: https://github.com/daodao97/cursor-request-max"
echo "�� 使用文档: README.md" 