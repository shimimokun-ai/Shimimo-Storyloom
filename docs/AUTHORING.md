# 剧情编写

## 场景与章节

每个场景是一个命令数组。章节文件只注册数据，不直接操作 DOM：

```js
StoryRepository.registerChapter('zh', 'chapter-01', {
    start: [
        { type: 'chapter', title: '第一章' },
        { type: 'dialogue', speaker: 'guide', text: '故事开始了。' },
        { type: 'jump', target: 'departure' }
    ],
    departure: [
        { type: 'dialogue', speaker: 'player', text: '出发！' },
        { type: 'sceneEnd', text: '感谢阅读。' }
    ]
});
```

在 `js/script.js` 中为每个场景添加映射：

```js
StoryRepository.defineLanguage('zh', GameScript, {
    start: 'js/story/zh/chapter-01.js',
    departure: 'js/story/zh/chapter-01.js'
});
```

`js/config.js` 中的 `project.startScene` 决定开始按钮入口，`chapters` 决定章节选择菜单。章节 ID 用于存储和解锁，应保持稳定，不要用翻译后的标题作为 ID。

## 命令

| 类型 | 主要字段 | 行为 |
| --- | --- | --- |
| `dialogue` | `speaker`, `text` | 对话；`speaker: 'system'` 为旁白 |
| `background` | `asset` | 切换配置中的背景，可为图片路径、十六进制颜色或 CSS 渐变 |
| `showCharacter` | `id`, `expression`, `position` | 显示角色；位置为 `left` / `center` / `right` |
| `hideCharacter` | `id` | 隐藏角色 |
| `choice` | `options: [{ text, target }]` | 等待玩家选择 |
| `jump` | `target` | 跳转场景 |
| `chapter` | `title` | 显示章节标题并解锁对应章节 |
| `setFlag` | `key`, `value` | 写入剧情标记 |
| `checkFlag` | `key`, `value`, `targetTrue`, `targetFalse` | 严格比较标记并跳转 |
| `wait` | `duration` | 等待，单位为毫秒 |
| `cg` | `asset`, `waitForClick` | 展示 CG 图片并解锁 |
| `bgm` | `asset`, `volume` | 播放 BGM；`asset: 'stop'` 停止 |
| `sound` | `asset`, `volume`, `duration` | 播放音效；音效持续时间单位为秒 |
| `stopSound` | 无 | 停止当前音效 |
| `effect` | `name: 'closeEye'` | 闭眼转场 |
| `minigame` | `targetSuccess`, `targetFail` | 节奏小游戏结束后跳转 |
| `fighting` | `targetNext` | 格斗小游戏结束后跳转 |
| `dodgeball`、`writing` | 无 | 小游戏结束后继续执行下一条命令 |
| `endingCredits` | 可选 `background`, `themes`, `speed` | 播放结尾名单，结束或跳过后继续 |
| `sceneEnd` | `text` | 标记通关，确认后回标题 |

`moveCharacter` 和 `hairFlip` 是兼容占位命令，当前不执行动画。不要将它们作为已经完成的演出功能。

## 翻译

示例提供中、日、英三种语言。各语言保持相同的场景 ID、命令顺序、角色 ID、资源键与跳转目标，只翻译 `text`、章节 `title` 和选项文字。`npm run check` 会检测结构漂移。

新增章节时，需要更新启用语言的章节文件、对应 `js/script*.js` 场景映射，以及配置中的章节入口。章节数量由配置决定，核心引擎没有固定的章节数。

## 调试

桌面开发版可以用 Electron 开发者工具检查报错。运行实例可通过 `window.game` 查看当前场景、命令索引和状态。可以调用 `game.loadScene('scene_id')` 跳到指定场景。

不要把未校验的用户输入直接拼进剧情脚本。剧情文件是可执行 JavaScript，只应加载你信任的项目代码。
