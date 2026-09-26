# RPUK Screenshot Cropper

<p align="center">
  <a href="https://github.com/KeyErrorFinn/rpuk-screenshot-cropper/commits/main"><img alt="GitHub last commit" src="https://img.shields.io/github/last-commit/KeyErrorFinn/rpuk-screenshot-cropper" /></a>
  <a href="https://github.com/KeyErrorFinn/rpuk-screenshot-cropper/issues"><img alt="GitHub issues" src="https://img.shields.io/github/issues/KeyErrorFinn/rpuk-screenshot-cropper" /></a>
</p>

<p align="center">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-47848F?logo=electron&logoColor=fff" />
  <img alt="React" src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB" />
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=fff" />
  <img alt="Sharp" src="https://img.shields.io/badge/Sharp-99CC00?logo=sharp&logoColor=000" />
  <img alt="npm" src="https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=fff" />
</p>

A desktop Electron application for reviewing screenshots, removing the fixed FiveM/RPUK interface bands, and organising processed images into date-based folders.

## Features

- Select a source screenshot folder and destination folder.
- Preview PNG, JPEG, and WebP screenshots.
- Select screenshots for batch processing.
- Crop a fixed 36-pixel top band and 53-pixel bottom band with Sharp.
- Group cropped and optional original images by the screenshot modification date.
- Browse processed images from the View tab.
- Persist folder and processing settings locally with `electron-store`.

## How it works

The Electron main process in `src/main/index.js` owns filesystem access and image processing. A context-isolated preload bridge exposes specific operations to the React renderer. The renderer displays lightweight WebP thumbnails, manages selection and settings, and asks the main process to crop files.

Processed files are written below the chosen destination:

```text
destination/
├── cropped/DD-MM-YY/cropped_<original-name>
└── original/DD-MM-YY/<original-name>
```

After successful processing, the source screenshot is deleted. Enable the keep-original setting if you want a copy retained in the destination.

## Development

Requires Node.js/npm and the native dependencies supported by Sharp and Electron.

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm run lint
npm run build
npm run build:win
npm run build:mac
npm run build:linux
```

## Project structure

- `src/main/`  -  Electron lifecycle, IPC, filesystem operations, and Sharp cropping.
- `src/preload/`  -  isolated renderer API.
- `src/renderer/`  -  React interface, settings, crop, and viewer tabs.
- `electron-builder.yml`  -  packaging configuration.
- `resources/` and `build/`  -  application icons and packaging assets.

## Important notes

- Back up valuable screenshots before first use because processed source files are removed.
- The crop dimensions are tailored to a specific screenshot layout.
- Packaging targets should be tested on their respective operating systems.

## Project flow

```mermaid
flowchart LR
    Renderer["React interface"] --> Preload["Isolated preload bridge"]
    Preload --> Main["Electron main process"]
    Main --> Sharp["Sharp crop pipeline"]
    Sharp --> Folders["Dated cropped/original folders"]
```
