StoryRepository.registerChapter("zh", "chapter-02", {
  "chapter_two": [
    {
      "type": "chapter",
      "title": "第二章 · 写下你的故事"
    },
    {
      "type": "background",
      "asset": "evening"
    },
    {
      "type": "showCharacter",
      "id": "guide",
      "expression": "default",
      "position": "center"
    },
    {
      "type": "dialogue",
      "speaker": "guide",
      "text": "你刚刚体验了对话、角色、背景、分支和剧情标记。"
    },
    {
      "type": "dialogue",
      "speaker": "guide",
      "text": "现在，把这些示例替换成你的角色与台词吧。"
    },
    {
      "type": "choice",
      "options": [
        {
          "text": "先看一段结尾名单",
          "target": "ending"
        },
        {
          "text": "试试四个小游戏",
          "target": "arcade_rhythm"
        }
      ]
    }
  ],
  "arcade_rhythm": [
    {
      "type": "minigame",
      "targetSuccess": "arcade_fight",
      "targetFail": "arcade_fight"
    }
  ],
  "arcade_fight": [
    {
      "type": "fighting",
      "targetNext": "arcade_snow"
    }
  ],
  "arcade_snow": [
    {
      "type": "dodgeball"
    },
    {
      "type": "jump",
      "target": "arcade_writing"
    }
  ],
  "arcade_writing": [
    {
      "type": "writing"
    },
    {
      "type": "jump",
      "target": "ending"
    }
  ],
  "ending": [
    {
      "type": "checkFlag",
      "key": "visited_lights",
      "value": true,
      "targetTrue": "ending_lights",
      "targetFalse": "ending_talk"
    }
  ],
  "ending_lights": [
    {
      "type": "dialogue",
      "speaker": "guide",
      "text": "你迈出了第一步。"
    },
    {
      "type": "jump",
      "target": "credits"
    }
  ],
  "ending_talk": [
    {
      "type": "dialogue",
      "speaker": "guide",
      "text": "有时，停下来倾听也是一种选择。"
    },
    {
      "type": "jump",
      "target": "credits"
    }
  ],
  "credits": [
    {
      "type": "dialogue",
      "speaker": "guide",
      "text": "用你自己的故事，继续这段旅程。"
    },
    {
      "type": "endingCredits",
      "background": "evening",
      "speed": 50
    },
    {
      "type": "sceneEnd",
      "text": "示例结束。你的故事才刚刚开始。"
    }
  ]
});
