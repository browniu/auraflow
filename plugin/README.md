# AuraFlow 浏览器插件

AuraFlow Automation Engine - 浏览器自动化执行引擎

## 功能

- 通过 Session ID 从服务端获取工作流任务信息
- 自动填充提示词到目标 AI 应用的输入框
- 支持多种输入元素类型 (textarea, input, contenteditable, p 等)
- 自动点击发送按钮
- 捕获并上报结果

## 安装步骤

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本 `plugin` 文件夹

## 使用方式

1. 在 AuraFlow Web 设计器中创建工作流
2. 运行工作流，点击"打开应用"
3. 系统会自动打开目标 AI 网站，并附带 Session ID
4. 插件会自动识别 Session ID 并从服务端获取任务配置
5. 点击「填充内容」将提示词填入输入框
6. 点击「自动发送」一键完成填充和发送
7. 点击「捕获结果」获取 AI 回复并上传到服务端

## 配置说明

插件默认连接 `http://localhost:3737/api` 服务端。

如需修改，请编辑 `content.js` 中的 `API_BASE_URL` 常量。

## 支持的输入元素

插件支持以下类型的输入元素：

| 元素类型 | 填充方式 |
|---------|---------|
| `<textarea>` | `element.value = text` |
| `<input type="text">` | `element.value = text` |
| `contenteditable` 元素 | `element.innerText = text` |
| `<p>` (如 ChatGPT) | `element.innerText = text` |
| ProseMirror 编辑器 | `element.innerText = text` |

## 服务端 API

插件使用以下 API 端点：

- `GET /api/session/:sessionId` - 获取会话信息
- `POST /api/session/:sessionId/complete` - 提交会话结果

## 故障排除

### 服务器不可用

如果服务端未启动，插件会自动切换到本地模式，并显示测试提示词。

启动服务端：
```bash
cd auraflow
npm run server
```

### 无法找到输入框

1. 检查模组配置中的 DOM 选择器是否正确
2. 插件会自动尝试备用选择器
3. 可以按 F12 打开开发者工具查看正确的选择器

### 填充内容不生效

某些网站使用 React/Vue 等框架的受控组件，填充后需要触发 `input` 事件。
插件已内置相关处理，如仍不生效请反馈。

## 更新日志

### v1.0.0
- 实现服务端 API 集成
- 支持多种输入元素类型
- 添加结果捕获和上报功能
- 添加本地模式降级处理
