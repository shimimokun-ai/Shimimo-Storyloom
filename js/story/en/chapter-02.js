StoryRepository.registerChapter("en", "chapter-02", {
  "chapter_two": [
    {
      "type": "chapter",
      "title": "Chapter 2 · Write Your Story"
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
      "text": "You have just tried dialogue, characters, backgrounds, branches and story flags."
    },
    {
      "type": "dialogue",
      "speaker": "guide",
      "text": "Now replace this sample with your own characters and lines."
    },
    {
      "type": "choice",
      "options": [
        {
          "text": "Watch the ending credits",
          "target": "ending"
        },
        {
          "text": "Try the four minigames",
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
      "text": "You took the first step."
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
      "text": "Sometimes stopping to listen is a choice, too."
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
      "text": "Continue this journey with a story of your own."
    },
    {
      "type": "endingCredits",
      "background": "evening",
      "speed": 50
    },
    {
      "type": "sceneEnd",
      "text": "The sample ends here. Your story is just beginning."
    }
  ]
});
