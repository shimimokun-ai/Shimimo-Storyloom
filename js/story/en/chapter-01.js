StoryRepository.registerChapter("en", "chapter-01", {
  "start": [
    {
      "type": "chapter",
      "title": "Chapter 1 · Start Here"
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
      "text": "Welcome. This sample uses text and code-drawn UI, with no bundled artwork or recordings."
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
      "text": "I want to write my own story with this framework."
    },
    {
      "type": "dialogue",
      "speaker": "guide",
      "text": "Start with a choice. Where would you like to go?"
    },
    {
      "type": "choice",
      "options": [
        {
          "text": "Visit the distant lights",
          "target": "lights"
        },
        {
          "text": "Stay and talk for a while",
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
      "text": "You took the first step."
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
      "text": "Sometimes stopping to listen is a choice, too."
    },
    {
      "type": "jump",
      "target": "chapter_two"
    }
  ]
});
