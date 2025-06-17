# GitHub Actions 工作流说明

本项目包含两个主要的 GitHub Actions 工作流：

## 1. CI 工作流 (`ci.yml`)

**触发条件：**
- 推送到 `main`、`master` 或 `develop` 分支
- 创建针对这些分支的 Pull Request

**功能：**
- 在 Node.js 18 和 20 版本下进行测试
- TypeScript 类型检查
- React 组件构建
- 验证扩展打包是否成功

## 2. 发布工作流 (`release.yml`)

**触发条件：**
- 推送以 `v` 开头的标签（如 `v1.0.0`）
- 手动触发（workflow_dispatch）

**功能：**
- 自动构建和打包扩展
- 创建 GitHub Release
- 上传 `.vsix` 文件到 Release
- 可选：发布到 VS Code Marketplace

## 使用方法

### 发布新版本

1. **更新版本号：**
   ```bash
   npm version patch  # 或 minor/major
   ```

2. **推送标签：**
   ```bash
   git push origin v1.0.0  # 替换为实际版本号
   ```

3. **自动发布：**
   - GitHub Actions 会自动触发
   - 创建 Release 并上传 `.vsix` 文件

### 发布到 VS Code Marketplace

如果要发布到官方 Marketplace，需要：

1. **获取 Personal Access Token：**
   - 访问 [Azure DevOps](https://dev.azure.com/)
   - 创建 Personal Access Token，权限设置为 `Marketplace (Acquire, Manage)`

2. **设置 GitHub Secret：**
   - 在仓库设置中添加名为 `VSCE_PAT` 的 Secret
   - 值为上一步获取的 Token

3. **发布：**
   - 推送正式版本标签（不包含 `-beta`、`-alpha` 等）
   - 工作流会自动发布到 Marketplace

## 本地开发命令

```bash
# 编译 TypeScript
npm run compile

# 构建 React 组件
npm run build:react

# 本地打包扩展
npm run package

# 发布到 Marketplace（需要 VSCE_PAT 环境变量）
npm run publish
``` 