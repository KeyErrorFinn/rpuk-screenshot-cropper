# RPUK Screenshot Cropper

A local Electron desktop utility for cropping repeated interface areas from game screenshots, organising the results by date, and optionally sharing selected images through Gyazo.

## Main workflows

- Watch a configured screenshot folder and load supported PNG, JPEG, and WebP images.
- Select individual screenshots or crop an entire incoming batch.
- Maintain precise crop presets for different source resolutions.
- Preview removed areas before cropping and use local edge suggestions as a starting point.
- Preserve originals when configured and recover interrupted crop operations.
- Review cropped images in dated folders with search, tags, filters, favourites, zoom, and fullscreen viewing.
- Copy images or Gyazo links, upload selected images, and move unwanted images to the Recycle Bin.
- Import external files by drag-and-drop or paste an image from the clipboard.

All image processing and crop assistance happen locally. Images leave the computer only when the user explicitly uploads them to Gyazo.

## Development

Requirements: a current Node.js release supported by the installed Electron toolchain and npm.

```powershell
npm.cmd install
npm.cmd run dev
```

Electron main-process and preload changes require a full application restart; renderer hot reload alone does not reload IPC handlers.

## Validation

```powershell
npm.cmd test
npm.cmd run test:ui
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
```

The Node suite covers services and pure application logic, while Vitest covers renderer controllers, dialogs, and gallery virtualization. The Playwright command builds an unpacked production executable and exercises its sandbox bridge, filesystem watcher, crop transaction, collision handling, and undo workflow. The Node test script intentionally uses `tests/*.test.js` for Windows compatibility.

## Data and recovery

Settings, image identities, crop history, upload state, diagnostic logs, and thumbnail-cache data are stored under Electron's per-user application-data directory. Crop operations create transaction and undo data there so interrupted batches can be recovered before normal startup.

Deleting a cropped image uses the operating system's Recycle Bin. Undoing a crop restores backed-up source images only when doing so will not overwrite a newer file.

## Keyboard and viewer controls

- `Left` / `Right`: previous or next image.
- Mouse wheel: previous or next image in the normal viewer.
- `Space`: select the displayed image.
- `Ctrl+C`: copy the displayed image.
- `Escape`: close the viewer.
- `Ctrl+mouse wheel`: zoom in the crop editor.
- `Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`: crop-editor undo and redo.

## Supported platforms

The application is primarily designed and tested for Windows because it uses Windows taskbar and Recycle Bin-oriented workflows. Packaging configuration also contains macOS and Linux targets, but those platforms should not be described as fully supported until packaged smoke tests are run on them.
