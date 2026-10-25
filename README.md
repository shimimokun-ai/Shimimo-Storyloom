# Galgame Framework

一个基于 Electron、原生 JavaScript 与 CSS 的视觉小说框架。从已有游戏运行时独立整理，提供可以直接运行的示例，方便替换角色、素材和剧情，制作自己的故事。

**这个源码仓库没有附带图片、音频、视频、字体、原作剧情或制作母版。** 默认界面使用灰白配色、系统字体、普通按钮和文字角色卡，成就以 1、2、3 占位；小游戏使用 Canvas 绘图与合成音效。克隆后不需要下载额外素材。

## 启动

安装 Node.js 22.12 或更新版本（推荐 24）和 Git，然后在本仓库运行：

```bash
npm ci
npm start
```

首次启动选择语言与音量，点击“保存并进入游戏”。示例包含两章、两个选择分支，以及可选的四个小游戏。

只预览网页也可以：

```bash
npm run serve
```

打开终端显示的本地地址。网页模式支持剧情、设置、章节选择、图鉴与小游戏；桌面退出、系统全屏管理和角色聊天接口通过 Electron 提供。

## 功能

- 对话、打字效果、AUTO、SKIP、剧情历史。
- 场景跳转、选项分支、剧情标记和条件跳转。
- 独立章节文件、按需加载、章节解锁。
- 中日英示例和界面翻译。
- 背景、立绘、CG、BGM、音效和配音接口；空资源配置即可运行。
- 角色资料、设置、本地成就和结尾名单。
- 节奏、格斗、雪地躲避、书写四个小游戏。
- 可选的角色 AI 聊天和 Steam 成就适配器，默认不启用外部服务。

## 写自己的故事

主要修改两类文件：

| 文件 | 内容 |
| --- | --- |
| `js/config.js` | 项目标识、标题、主角、角色、章节入口、资源、功能开关与界面文字 |
| `js/story/zh/` | 中文剧情场景与命令数组 |
| `js/story/ja/`、`js/story/en/` | 对应的翻译版本 |
| `js/script*.js` | 场景 ID 到章节脚本的映射 |
| `css/framework.css` | 不依赖图片的默认主题 |
| `js/generated/ending-credits.js`、`js/locales/ending-credits-*.js` | 示例结尾名单，可直接编辑 |

例如：

```js
{ type: 'background', asset: 'morning' },
{ type: 'showCharacter', id: 'guide', expression: 'default', position: 'right' },
{ type: 'dialogue', speaker: 'guide', text: '你想去哪里？' },
{ type: 'choice', options: [
    { text: '出发', target: 'departure' },
    { text: '留下', target: 'stay' }
] }
```

角色没有图片时会显示名字卡片。接入自己的素材时，只需在配置中添加路径；剧情继续使用资源键。

完整说明见 [剧情编写](docs/AUTHORING.md)、[功能与素材配置](docs/CONFIGURATION.md) 和 [架构](docs/ARCHITECTURE.md)。

## 检查与打包

```bash
npm run verify       # 结构、剧情、测试与无素材检查
npm run test:smoke   # 用真实 Electron 隐藏窗口验证完整流程
npm run package      # 生成目录版，输出到 dist/
npm run dist         # 在 Windows 生成 ZIP 发行包
```

打包使用明确的文件白名单，排除测试、制作工具、文档、缓存和本地配置。默认不需要原作图标或 Steam DLL，使用 Electron 默认应用图标。

制作自己的游戏前，应修改 `js/config.js` 的 `project.id`，以及 `package.json` 的应用名称、`build.appId`、`build.productName` 和可执行文件名，避免不同作品共用存储或应用身份。

## 开源仓库与自己的游戏

上游仓库保持纯文本源码，`.gitignore` 默认排除美术、音频、视频和工程文件，`npm run audit:source` 会检查工作目录与 Git 历史中是否混入这些文件。自己的游戏仓库可以调整忽略规则，并将这一上游专用检查从 `verify` 中移除。

这是独立 Git 历史，不包含原游戏仓库的提交记录。首次发布 GitHub 的步骤见 [发布说明](docs/PUBLISHING.md)。

代码与随附示例使用 [ISC 许可证](LICENSE)，可在保留许可证声明的前提下使用、修改和分发。第三方运行时与依赖的许可证见 [第三方说明](THIRD_PARTY_NOTICES.md)。你后续加入的故事、美术和音乐可以单独约定授权。
