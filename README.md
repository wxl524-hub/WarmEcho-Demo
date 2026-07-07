# WarmEcho-Demo

暖声（Warm Echo）AI 情绪陪伴树洞 —— 用户端演示

## 项目简介

这是一个基于 Vue 3 + Vite 构建的 AI 情绪陪伴 Web 应用前端项目，包含以下核心页面：

- **WelcomePage** - 欢迎页，展示应用温暖调性的入口
- **ChatPage** - AI 对话页，与 AI 进行情绪倾诉与陪伴
- **CalmPage** - 静心空间，提供冥想引导和情绪舒缓
- **GalleryPage** - 回声广场，用户分享与互助社区
- **MyEchoPage** - 个人中心，管理个人动态与设置
- **GrowthPage** - 成长记录，追踪情绪变化与成长轨迹
- **ResourcesPage** - 资源库，提供情绪管理相关资源

## 技术栈

- Vue 3 Composition API
- Vue Router 4
- Pinia 状态管理
- Vite 构建工具
- Axios HTTP 请求

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## GitHub Pages 部署

本项目已配置 GitHub Actions 自动部署工作流：

1. 在 GitHub 创建名为 `WarmEcho-Demo` 的仓库
2. 将代码推送到 `main` 分支
3. 进入仓库 Settings > Pages
4. Source 选择 "GitHub Actions"
5. 每次推送到 main 分支将自动构建并部署

部署后的访问地址：`https://<你的用户名>.github.io/WarmEcho-Demo/`

## 注意

- 本仓库仅包含前端用户端代码
- 后端 API 服务需要单独部署，API 地址以相对路径 `/api` 调用
- 若需要完整功能，请确保后端服务已运行并配置好跨域访问
