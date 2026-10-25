# Third-party notices

The framework code and bundled text-only example are distributed under the ISC license in `LICENSE`.

The project was extracted by its author from an existing game runtime. Original game artwork, audio, video, story text, character personas, production documents, asset archives, and Git/LFS history are not distributed here.

The following packages are installed from npm rather than vendored into this source repository:

| Package | Role | Upstream license |
| --- | --- | --- |
| [Electron](https://github.com/electron/electron) | Desktop runtime, Chromium and Node.js integration | MIT; bundled third-party components retain their own notices |
| [electron-builder](https://github.com/electron-userland/electron-builder) | Development and packaging tool | MIT |

Transitive dependencies retain their own licenses in the installed packages. Electron distributions include license and third-party notice files; keep these with redistributed desktop runtime binaries.

No third-party font, icon pack, sprite sheet, music, voice recording, or Steam SDK binary is bundled in this source repository. System font family names in CSS are fallback preferences and do not distribute font files. Default minigame visuals are drawn by JavaScript and Canvas.

The optional Steam adapter requires a separately installed `steamworks.js` package and the developer's own Steamworks setup. Their upstream licenses and platform terms apply when that integration is enabled.
