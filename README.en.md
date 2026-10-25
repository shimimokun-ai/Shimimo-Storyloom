<h1 align="center">Shimimo-Storyloom</h1>

<p align="center">Weave a visual novel with your own characters, choices and endings.</p>
<p align="center"><strong>Electron · JavaScript · CSS</strong></p>

<p align="center">
  <a href="README.md">简体中文</a> · <strong>English</strong> · <a href="README.ja.md">日本語</a>
</p>

<p align="center">
  <a href="https://github.com/shimimokun-ai/Shimimo-Storyloom/actions/workflows/check.yml"><img src="https://github.com/shimimokun-ai/Shimimo-Storyloom/actions/workflows/check.yml/badge.svg?branch=main" alt="Source checks"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/Node.js-22.12%2B-43853D?style=flat-square" alt="Node.js 22.12 or later"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-ISC-475569?style=flat-square" alt="ISC license"></a>
  <a href="assets/README.md"><img src="https://img.shields.io/badge/game_assets-none-64748B?style=flat-square" alt="No bundled game assets"></a>
</p>

---

**Shimimo-Storyloom** is Shimimo's visual novel framework, extracted from an existing game runtime into an independent project. Start with a runnable example, then replace its characters, story and interface to create your own work. Storyloom is a name for weaving stories.

> [!NOTE]
> No artwork, music, voice recordings, video, fonts or story text from the original game are included. The defaults use a gray and white interface, system fonts, text character cards and achievement placeholders **1, 2, 3**. Minigames use Canvas drawing and synthesized sound, so the sample runs without extra assets.

## Quick start

Install **Node.js 22.12+** (24 recommended) and Git.

```bash
git clone https://github.com/shimimokun-ai/Shimimo-Storyloom.git
cd Shimimo-Storyloom
npm ci
npm start
```

On first launch, choose a language and volume, then save your preferences to enter the game. The sample includes two chapters, branching choices and optional minigames.

<details>
<summary><strong>Prefer a browser preview?</strong></summary>

```bash
npm run serve
```

Open the local address printed in the terminal. Browser mode supports the story, settings, chapter selection, galleries and minigames. Desktop exit, system fullscreen management and the character chat API are provided through Electron.

</details>

## What's included

| Module | Features |
| --- | --- |
| **Story presentation** | Dialogue, typewriter text, characters, backgrounds, CGs and ending credits |
| **Branches and state** | Choices, scene jumps, story flags, conditions and chapter unlocks |
| **Reading controls** | AUTO, SKIP, dialogue history, volume and display preferences |
| **Languages** | Simplified Chinese, Japanese and English sample stories and UI |
| **Asset integration** | Your own sprites, backgrounds, music, effects and voices; empty maps work too |
| **Minigames** | Rhythm, fighting, snow dodging and writing; disable them when your project does not need them |
| **Optional extensions** | Character AI chat and a Steam achievements adapter; external services are off by default |

## Write your story

Start with the project configuration, then replace the story. Asset keys and scene IDs connect your content to the engine.

| What to change | Start here |
| --- | --- |
| Project identity, characters, chapters, assets and feature switches | [`js/config.js`](js/config.js) |
| Chinese story, used as the sample's structural reference | [`js/story/zh/`](js/story/zh/) |
| Japanese and English stories | [`js/story/ja/`](js/story/ja/) · [`js/story/en/`](js/story/en/) |
| Scene-to-chapter mappings | [`js/script.js`](js/script.js) · [`js/script_ja.js`](js/script_ja.js) · [`js/script_en.js`](js/script_en.js) |
| Default interface theme | [`css/framework.css`](css/framework.css) |
| Ending credits | [`js/generated/ending-credits.js`](js/generated/ending-credits.js) · [`js/locales/`](js/locales/) |

Stories are made from command fragments like this:

```js
{ type: 'background', asset: 'morning' },
{ type: 'showCharacter', id: 'guide', expression: 'default', position: 'right' },
{ type: 'dialogue', speaker: 'guide', text: 'Where would you like to go?' },
{ type: 'choice', options: [
    { text: 'Set out', target: 'departure' },
    { text: 'Stay here', target: 'stay' }
] }
```

Define target scenes such as `departure` and `stay` in a chapter, then update the scene manifest. Keep scene IDs, command order and control flow aligned across all three languages; translate only the displayed text.

Characters without sprites appear as name cards. When you add your own assets, put their paths in the configuration and continue referencing asset keys in the story.

> [!TIP]
> For a new game, change `project.id` and the application name, `build.appId`, `build.productName` and executable name in `package.json`. Each project can then use its own storage namespace and application identity.

## Checks and builds

| Command | Purpose |
| --- | --- |
| `npm run verify` | Source validation, story structure, tests and the source-only audit |
| `npm run test:smoke` | Exercise the full sample in a real, hidden Electron window |
| `npm run package` | Create a Windows unpacked build in `dist/` |
| `npm run check:package` | Check packaged dependencies and game media |
| `npm run test:package` | Launch the generated Windows EXE and test the full flow |
| `npm run dist` | Create a Windows ZIP distribution |

Packaging uses an explicit file allowlist to exclude production tools, tests, documentation, caches and local settings. The default Electron application icon is used; no original game icon or Steam DLL is required.

<details>
<summary><strong>Turn the framework into your own game repository</strong></summary>

The upstream repository contains text source only. Its `.gitignore` excludes artwork, audio, video and production files by default. `npm run audit:source` maintains this asset-free upstream version.

For your own game repository, adjust the ignore rules as needed and remove this upstream-specific audit from `verify`. State the license terms for any story, assets and music you add.

The framework has an independent Git history, with no commits copied from the original game repository. See the [publishing guide](docs/PUBLISHING.md) (Chinese) for maintenance and release steps.

</details>

## Documentation

The detailed guides below are currently written in Chinese. This README covers setup, customization and build commands in English.

| Guide | Contents |
| --- | --- |
| [Story authoring](docs/AUTHORING.md) | Chapters, scenes, commands, branches and translation |
| [Features and assets](docs/CONFIGURATION.md) | Assets, feature switches, voice, AI chat and Steam |
| [Architecture](docs/ARCHITECTURE.md) | Core modules, runtime flow and desktop boundaries |
| [Publishing](docs/PUBLISHING.md) | Source checks, Windows builds and repository maintenance |

## License and feedback

The framework code and bundled example use the [ISC license](LICENSE). Keep the license notice with your copies. Runtime and dependency licenses are covered in [third-party notices](THIRD_PARTY_NOTICES.md). Stories, artwork and music you add may use separate license terms.

Report problems through [Issues](https://github.com/shimimokun-ai/Shimimo-Storyloom/issues), or contribute improvements through [Pull requests](https://github.com/shimimokun-ai/Shimimo-Storyloom/pulls).
