# 自己的资源放在这里

框架仓库没有图片、音频、视频或字体文件。示例使用文字角色卡、CSS 背景和 Canvas 绘图即可完整运行。

要接入自己的素材，可创建 `assets/backgrounds/`、`assets/characters/`、`assets/audio/`，在 `js/config.js` 中配置相对路径。剧情引用配置键，不直接写文件路径。

上游 `.gitignore` 默认排除媒体文件，避免误提交原作资源。制作自己的游戏仓库时，可按需要调整忽略规则，并为自己的资源明确授权。`npm run audit:source` 专门验证上游源码仓库不携带这些文件。
