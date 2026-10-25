# 架构

渲染层使用原生 JavaScript，全局模块按 `index.html` 中的顺序加载，无前端打包器。桌面壳使用 Electron，故事也可通过本地 HTTP 服务在浏览器运行。

| 层 | 文件 | 职责 |
| --- | --- | --- |
| 桌面壳 | `main.js`、`preload.js`、`electron/` | 安全窗口、最小 IPC、可选网络代理与平台成就 |
| 项目配置 | `js/config.js` | 作品身份、角色、素材、章节、功能开关和界面翻译 |
| 剧情仓库 | `js/story/`、`js/script*.js` | 注册、按需加载和场景查询 |
| 命令系统 | `js/core/command-handlers.js` | 命令分发与明确的继续策略 |
| 流程编排 | `js/engine.js` | 启动、输入、剧情推进、角色与转场 |
| 服务 | `js/services/` | 存储、音频、本地化、成就、临时活动生命周期 |
| 界面 | `js/ui/`、`css/` | 菜单、设置、历史、图鉴、名单 |
| 小游戏 | `js/minigames/` | 独立的输入、模拟和 Canvas 展示 |
| 工程工具 | `tools/` | 校验、测试、无素材审计和预览服务 |

剧情命令完成后必须明确选择：调用 `advanceCommand()`、等待用户或异步完成、调用 `loadScene()`，或由小游戏接管后恢复流程。不要同时触发两种推进方式。

`ActivityScope` 集中释放小游戏监听器、定时器和动画帧；弹层通过 `enterOverlay` / `leaveOverlay` 维护焦点、输入和自动播放状态。

`SaveManager` 处理浏览器存储容错；命名空间来自 `project.id`。成就独立保存，不作为剧情分支证据。

Electron 保留 `nodeIntegration: false`、`contextIsolation: true`、`sandbox: true`。IPC 校验主窗口与主框架来源，页面不能任意导航、创建窗口或读取主进程凭据。

提取后的默认配置不包含原作章节、角色设定、聊天人设、制作名单、媒体路径或平台 App ID。没有复制原作仓库的 `.git`、LFS 对象、资源目录、制作工具输出或交付压缩包。
