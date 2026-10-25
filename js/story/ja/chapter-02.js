StoryRepository.registerChapter("ja", "chapter-02", {
  "chapter_two": [
    {
      "type": "chapter",
      "title": "第二章 · 物語を書こう"
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
      "text": "会話、キャラクター、背景、分岐、フラグを体験しましたね。"
    },
    {
      "type": "dialogue",
      "speaker": "guide",
      "text": "次はあなたのキャラクターとセリフに置き換えてください。"
    },
    {
      "type": "choice",
      "options": [
        {
          "text": "エンディングを見る",
          "target": "ending"
        },
        {
          "text": "四つのミニゲームを試す",
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
      "text": "あなたは最初の一歩を踏み出しました。"
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
      "text": "立ち止まって耳を傾けることも、一つの選択です。"
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
      "text": "あなたの物語で、この旅を続けましょう。"
    },
    {
      "type": "endingCredits",
      "background": "evening",
      "speed": 50
    },
    {
      "type": "sceneEnd",
      "text": "サンプルはここまで。あなたの物語はこれからです。"
    }
  ]
});
