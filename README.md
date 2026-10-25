<h1 align="center">Shimimo-Storyloom</h1>

<p align="center">用你自己的角色、选择与结局，编织一部视觉小说。</p>
<p align="center"><strong>Electron · JavaScript · CSS</strong></p>

<p align="center">
  <strong>简体中文</strong> · <a href="README.en.md">English</a> · <a href="README.ja.md">日本語</a>
</p>

<p align="center">
  <a href="https://github.com/shimimokun-ai/Shimimo-Storyloom/actions/workflows/check.yml"><img src="https://github.com/shimimokun-ai/Shimimo-Storyloom/actions/workflows/check.yml/badge.svg?branch=main" alt="源码检查"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/Node.js-22.12%2B-43853D?style=flat-square" alt="Node.js 22.12 或更高版本"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-ISC-475569?style=flat-square" alt="ISC 许可证"></a>
  <a href="assets/README.md"><img src="https://img.shields.io/badge/game_assets-none-64748B?style=flat-square" alt="不附带游戏素材"></a>
</p>

---

**Shimimo-Storyloom** 是 Shimimo 从已有游戏运行时独立整理的视觉小说框架。它提供可直接运行的示例，让你替换角色、剧情与界面，制作自己的作品。Storyloom，意为“编织故事”。

> [!NOTE]
> 仓库不附带原作美术、音乐、配音、视频、字体或剧情。默认使用灰白界面、系统字体与文字角色卡，成就以 **1、2、3** 占位；小游戏由 Canvas 绘图与合成音效驱动，无需额外素材即可运行。

## 快速开始

需要 **Node.js 22.12+**（推荐 24）和 Git。

```bash
git clone https://github.com/shimimokun-ai/Shimimo-Storyloom.git
cd Shimimo-Storyloom
npm ci
npm start
```

首次启动选择语言与音量，点击“保存并进入游戏”，即可体验两章示例、选择分支和可选小游戏。

<details>
<summary><strong>只想在浏览器中预览？</strong></summary>

```bash
npm run serve
```

打开终端显示的本地地址。浏览器版支持剧情、设置、章节选择、图鉴与小游戏；桌面退出、系统全屏管理和角色聊天接口由 Electron 提供。

</details>

## 框架里有什么

| 模块 | 支持内容 |
| --- | --- |
| **剧情演出** | 对话、打字效果、角色显示、背景切换、CG 与结尾名单 |
| **分支与状态** | 选择、场景跳转、剧情标记、条件判断与章节解锁 |
| **阅读体验** | AUTO、SKIP、剧情历史、音量与显示设置 |
| **多语言** | 简体中文、日本語、English 示例剧情与界面 |
| **素材接入** | 自己的立绘、背景、BGM、音效和配音；空配置即可运行 |
| **小游戏** | 节奏、格斗、雪地躲避与书写，可按项目需要关闭 |
| **可选扩展** | 角色 AI 聊天、Steam 成就适配器，默认不启用外部服务 |

## 开始写你的故事

先改项目配置，再替换剧情。核心引擎通过资源键与场景 ID 连接内容。

| 想修改什么 | 从这里开始 |
| --- | --- |
| 项目标识、角色、章节、资源与功能开关 | [`js/config.js`](js/config.js) |
| 中文剧情，作为示例的结构基准 | [`js/story/zh/`](js/story/zh/) |
| 日文与英文剧情 | [`js/story/ja/`](js/story/ja/) · [`js/story/en/`](js/story/en/) |
| 场景到章节的映射 | [`js/script.js`](js/script.js) · [`js/script_ja.js`](js/script_ja.js) · [`js/script_en.js`](js/script_en.js) |
| 默认界面主题 | [`css/framework.css`](css/framework.css) |
| 结尾制作名单 | [`js/generated/ending-credits.js`](js/generated/ending-credits.js) · [`js/locales/`](js/locales/) |

剧情由这样的命令片段组成：

```js
{ type: 'background', asset: 'morning' },
{ type: 'showCharacter', id: 'guide', expression: 'default', position: 'right' },
{ type: 'dialogue', speaker: 'guide', text: '你想去哪里？' },
{ type: 'choice', options: [
    { text: '出发', target: 'departure' },
    { text: '留下', target: 'stay' }
] }
```

在章节中定义 `departure`、`stay` 等目标场景，再更新场景映射。三种语言保持相同的场景 ID、命令顺序和跳转关系，只翻译显示文字。

角色没有图片时显示名字卡片。需要接入自己的素材时，在配置中添加路径，剧情继续引用资源键。

> [!TIP]
> 创建自己的作品时，先修改 `project.id`，以及 `package.json` 中的应用名称、`build.appId`、`build.productName` 和可执行文件名，让不同作品使用各自的存储与应用身份。

## 检查与发行

| 命令 | 用途 |
| --- | --- |
| `npm run verify` | 源码、剧情结构、测试与无素材检查 |
| `npm run test:smoke` | 用真实 Electron 隐藏窗口验证完整示例流程 |
| `npm run package` | 在 Windows 生成目录版，输出至 `dist/` |
| `npm run check:package` | 检查发行包依赖与游戏素材状态 |
| `npm run test:package` | 在 Windows 启动生成的 EXE，验证完整流程 |
| `npm run dist` | 在 Windows 生成 ZIP 发行包 |

打包使用文件白名单，排除制作工具、测试、文档、缓存和本地配置。默认使用 Electron 应用图标，不需要原作图标或 Steam DLL。

<details>
<summary><strong>把框架变成自己的游戏仓库</strong></summary>

上游仓库保持纯文本源码，`.gitignore` 默认排除美术、音频、视频和工程文件。`npm run audit:source` 用于维护这个不带素材的上游版本。

自己的游戏仓库可以按需要调整忽略规则，并将这一上游专用检查从 `verify` 中移除。为你添加的剧情、素材与音乐明确授权范围。

框架使用独立 Git 历史，不包含原游戏仓库的提交记录；后续维护与发布见[发布说明](docs/PUBLISHING.md)。

</details>

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [剧情编写](docs/AUTHORING.md) | 章节、场景、命令、分支与翻译 |
| [功能与素材配置](docs/CONFIGURATION.md) | 素材、功能开关、配音、AI 聊天与 Steam |
| [架构](docs/ARCHITECTURE.md) | 核心模块、运行流程与桌面边界 |
| [发布说明](docs/PUBLISHING.md) | 源码检查、Windows 打包与仓库维护 |

## 许可与反馈

框架代码与随附示例使用 [ISC 许可证](LICENSE)。请保留许可证声明；第三方运行时与依赖的授权见[第三方说明](THIRD_PARTY_NOTICES.md)。后续加入的故事、美术和音乐可以单独约定授权。

欢迎通过 [Issues](https://github.com/shimimokun-ai/Shimimo-Storyloom/issues) 反馈问题，通过 [Pull requests](https://github.com/shimimokun-ai/Shimimo-Storyloom/pulls) 贡献改进。
