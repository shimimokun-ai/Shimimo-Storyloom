StoryRepository.registerChapter("zh", "chapter-01", {
  "start": [
    {
      "type": "chapter",
      "title": "第一章 · 从这里开始"
    },
    {
      "type": "background",
      "asset": "morning"
    },
    {
      "type": "showCharacter",
      "id": "guide",
      "expression": "default",
      "position": "right"
    },
    {
      "type": "dialogue",
      "speaker": "guide",
      "text": "欢迎。这个示例只使用文字和代码绘制的界面，没有附带美术或录音。"
    },
    {
      "type": "showCharacter",
      "id": "player",
      "expression": "default",
      "position": "left"
    },
    {
      "type": "dialogue",
      "speaker": "player",
      "text": "我想用这个框架写一个自己的故事。"
    },
    {
      "type": "dialogue",
      "speaker": "guide",
      "text": "从一个选择开始吧。你想先去哪里？"
    },
    {
      "type": "choice",
      "options": [
        {
          "text": "去看看远处的灯光",
          "target": "lights"
        },
        {
          "text": "留在这里聊一会儿",
          "target": "conversation"
        }
      ]
    }
  ],
  "lights": [
    {
      "type": "setFlag",
      "key": "visited_lights",
      "value": true
    },
    {
      "type": "dialogue",
      "speaker": "system",
      "text": "你迈出了第一步。"
    },
    {
      "type": "jump",
      "target": "chapter_two"
    }
  ],
  "conversation": [
    {
      "type": "setFlag",
      "key": "visited_lights",
      "value": false
    },
    {
      "type": "dialogue",
      "speaker": "guide",
      "text": "有时，停下来倾听也是一种选择。"
    },
    {
      "type": "jump",
      "target": "chapter_two"
    }
  ]
});
