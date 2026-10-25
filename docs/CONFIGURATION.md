# 功能与素材配置

## 项目身份与默认界面

`js/config.js` 的 `project.id` 用作 Electron 用户数据目录与浏览器存储命名空间。给每个作品设置不同、稳定的小写英文 ID；发布之后改 ID 会切换到新的存储空间。

`project.protagonist` 是主角角色 ID，`project.startScene` 是新游戏入口。`mainMenuBackgrounds` 可以是 CSS 渐变、十六进制颜色或自己的图片路径。语言中的 `ui.gameTitle` 控制标题文字，也可以设置 `titleImage`。

## 素材

默认配置中 `sprites`、`cgs`、`bgm`、`soundEffects` 为空。角色没有立绘时显示文字卡，不会请求不存在的文件。配入自己的素材例如：

```js
characters: {
    player: {
        name: '主角', color: '#49677e',
        sprites: { default: 'assets/characters/player.png', smile: 'assets/characters/player-smile.png' }
    }
},
backgrounds: { morning: 'assets/backgrounds/morning.jpg' },
bgm: { title: 'assets/audio/title.ogg' },
soundEffects: { door: 'assets/audio/door.wav' }
```

`startup.video` 可设为自己的开场视频，`startup.voices` 是可选开场语音路径数组，`startup.menuBgm` 是 BGM 配置键。没有配置时直接进入首次设置或菜单，不播放媒体。

`startupAudioPreview` 可为音量设置提供试听，未配置的试听按钮会禁用。`js/generated/voice-manifest.js` 的 `entries` 以 `场景ID:命令索引` 定位配音，值为 `{ id, speaker, src }`；旧式平面清单默认对应中文。多语言录音可使用 `languages[语言].entries`，并在 `voiceLanguages` 中启用对应语言。没有录音清单时对白保持静音。

## 功能开关

| 配置 | 默认 | 说明 |
| --- | --- | --- |
| `features.chat` | `false` | 显示角色聊天与 API 设置，桌面版可接兼容 Chat Completions 的服务 |
| `features.cgGallery` | `false` | 显示 CG 菜单；添加 CG 后可开启 |
| `features.characterGallery` | `true` | 角色资料菜单 |
| `features.achievements` | `true` | 本地成就界面 |
| `features.startupNotice` | `false` | 首次设置后的阅读提示，文字来自各语言 UI 配置 |
| `features.minigames` | `true` | 小游戏；关闭后节奏走成功分支、格斗走下一场景，躲避与书写继续下一条命令 |

小游戏角色从 `minigames` 配置读取。默认不加载任何精灵图，格斗人物、雪地障碍和按键标签由代码绘制。可通过 `fighting.sprites`、`dodgeball.sprites`、`inputPrompts` 指定自己的图片。

## AI 聊天

开启 `features.chat` 后，在 `chat.contacts` 指定角色，在 `chat.cards` 为角色提供各语言的 `prompt`、`greeting`。`unlockAfterEnding` 控制是否通关后才允许聊天。

玩家在桌面版设置中输入自己的接口地址、模型和密钥。网络请求由 Electron 主进程发起；渲染进程通过受限 IPC 调用，不读取密钥。可持久保存时使用 Electron `safeStorage` 加密，环境不支持时只在进程内保留。此仓库没有共享 API Key，不需要配置 API 即可阅读剧情。

## Steam

默认 `steam-config.json` 的 `appId` 为 `null`，不需要 Steam 客户端或 SDK。成就保存在本机。

要为自己的作品接入 Steam，安装 `steamworks.js`，填写自己的 App ID，在后台配置对应成就，并按适配器版本的要求处理原生库和打包。`enableOverlay` 默认关闭。此仓库没有 Steam SDK、DLL、账户信息或已分配的游戏 App ID；Steam 集成未作为默认示例的验收范围。

## 自己的成就与结尾

可在配置中添加 `achievements.definitions`，字段为 `id`、`steamId`、可选图标以及 `zh`、`ja`、`en` 的 `name` / `description`。`achievements.milestones` 可指定 `{ id, scene, target }`，由实际执行的 `jump` 触发。未配置时使用通用示例成就。

结尾名单在 `js/generated/ending-credits.js` 和 `js/locales/ending-credits-*.js` 中编辑。它们在本模板中是可直接编辑的数据，不需要原作名单或生成工具。没有背景音乐和图片也能播放名单。
