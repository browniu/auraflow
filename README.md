<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AuraFlow - AI 工作流设计师

AuraFlow 是一款半自动化 AI 工作流编排工具，帮助用户将零散的 AI Web 应用串联成有序的、可重复执行的工作流。

## 功能特性

- 🎨 **可视化工作流编辑器** - 拖拽式节点编排
- 🔗 **跨模型协作** - 串联 ChatGPT、Gemini、Claude 等多种 AI 工具
- 💾 **云端存储** - 支持将工程文件保存到服务器
- 🔌 **浏览器插件** - 自动填充提示词、一键执行任务
- 🆓 **零成本** - 利用现有免费 Web AI 工具

## 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 启动应用

**方式一：同时启动前端和服务端（推荐）**

```bash
npm start
```

这将同时启动：
- 前端开发服务器：http://localhost:3000
- 后端 API 服务器：http://localhost:3001

**方式二：分开启动**

```bash
# 终端 1 - 启动服务端
npm run server

# 终端 2 - 启动前端
npm run dev
```

### 环境变量配置

创建 `.env.local` 文件：

```env
# Gemini API Key (用于 AI 智能配置助手)
GEMINI_API_KEY=your_gemini_api_key_here

# 服务端 API 地址 (可选，默认 http://localhost:3001/api)
VITE_API_URL=http://localhost:3001/api
```

## 浏览器插件安装

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目中的 `plugin` 文件夹

详细说明请参阅 [plugin/README.md](./plugin/README.md)

## 服务端 API

服务端提供以下 API：

### 项目管理

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/project/save` | 保存项目 |
| GET | `/api/project/load/:projectId` | 加载项目 |
| GET | `/api/project/list` | 获取项目列表 |
| DELETE | `/api/project/:projectId` | 删除项目 |

### 工作流会话

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/session/create` | 创建执行会话 |
| GET | `/api/session/:sessionId` | 获取会话信息 |
| POST | `/api/session/:sessionId/complete` | 完成会话 |
| GET | `/api/session/:sessionId/status` | 查询会话状态 |

### 健康检查

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/health` | 服务健康检查 |

## 项目结构

```
auraflow/
├── App.tsx                 # 主应用组件
├── types.ts                # TypeScript 类型定义
├── constants.ts            # 常量和默认配置
├── components/             # React 组件
│   ├── WorkflowCanvas.tsx  # 工作流画布
│   ├── ModuleEditor.tsx    # 模组编辑器
│   └── ui/                 # UI 组件
├── services/               # 服务层
│   ├── apiService.ts       # API 服务封装
│   ├── storageService.ts   # 存储服务
│   └── geminiService.ts    # Gemini AI 服务
├── server/                 # 服务端
│   └── server.js           # Express 服务器
└── plugin/                 # 浏览器插件
    ├── manifest.json       # 插件配置
    ├── content.js          # 内容脚本
    ├── background.js       # 后台脚本
    └── styles.css          # 样式
```

## 使用流程

1. **定义模组** - 配置 AI 工具的 URL、DOM 选择器和提示词模板
2. **编排工作流** - 拖拽模组到画布，连接节点
3. **保存到云端** - 点击"保存到云端"按钮同步数据
4. **执行工作流** - 点击"运行工作流"，系统引导执行
5. **插件自动化** - 浏览器插件自动填充提示词

## 数据存储

- **本地存储**：工作流和模组配置存储在浏览器 LocalStorage
- **云端存储**：点击"保存到云端"后，数据以 JSON 文件形式存储在 `server/data/` 目录

## License

MIT

---

*AuraFlow Team*
