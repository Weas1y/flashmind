# FlashMind — 英语单词卡

FlashMind 是一款交互式英语单词卡学习应用，帮助你高效记忆单词。

## 功能特性

- 📚 **单词集管理** — 创建、编辑属于自己的单词集
- 🎴 **卡片学习模式** — 翻转卡片进行单词记忆
- 🎮 **匹配游戏** — 通过配对游戏巩固记忆
- ✍️ **拼写测试** — 听写模式检验拼写能力
- 🔐 **邮箱注册登录** — 安全认证，数据云端同步
- 📱 **响应式设计** — 适配桌面端和移动端

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 6 |
| CSS 方案 | Tailwind CSS 3 |
| 路由 | React Router v7 |
| 状态管理 | Zustand |
| 后端框架 | Express 4 |
| 认证 | Bearer Token + 邮箱验证码 |

## 快速开始

```bash
# 克隆项目
git clone https://github.com/Weas1y/flashmind.git
cd flashmind

# 安装前端依赖
npm install

# 安装后端依赖
cd server && npm install && cd ..

# 启动开发服务器
npm run dev

# 启动后端 API（新终端）
cd server && node server.js
```

## 构建生产包

```bash
npm run build
```

构建产物位于 `dist/` 目录。

## 部署指南

详见 [DEPLOY.md](./DEPLOY.md)，包含从环境准备到生产部署的完整流程。

## 许可证

MIT