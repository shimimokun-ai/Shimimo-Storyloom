StoryRepository.registerChapter("ja", "chapter-01", {
  "start": [
    {
      "type": "chapter",
      "title": "第一章 · ここから始まる"
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
      "text": "ようこそ。このサンプルは文字とコードだけで動きます。画像や録音は同梱していません。"
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
      "text": "この仕組みで、自分の物語を書きたい。"
    },
    {
      "type": "dialogue",
      "speaker": "guide",
      "text": "一つの選択から始めましょう。どこへ行きますか？"
    },
    {
      "type": "choice",
      "options": [
        {
          "text": "遠くの明かりを見に行く",
          "target": "lights"
        },
        {
          "text": "ここで少し話す",
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
      "text": "あなたは最初の一歩を踏み出しました。"
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
      "text": "立ち止まって耳を傾けることも、一つの選択です。"
    },
    {
      "type": "jump",
      "target": "chapter_two"
    }
  ]
});
