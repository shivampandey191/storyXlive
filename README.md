# StoryXLive: Expo Video Editor with Native FFmpeg Overlays

StoryXLive is a demo app built with [Expo](https://expo.dev) and React Native, showcasing advanced video recording and editing features, including:

- **Live camera preview and recording** (via `react-native-vision-camera`)
- **Mute, trim, and export videos**
- **Interactive overlays** (emoji/text) with gesture controls
- **Burn overlays into video** using a custom native C++ TurboModule and the FFmpeg C API
- **Robust font and asset management** for overlay rendering

## Features

- Record video with live preview
- Add, move, scale, and rotate emoji/text overlays
- Mute or trim video segments
- Burn overlays into the exported video (native, no FFmpeg CLI dependency)
- Save to gallery and generate thumbnails

## Native Integration

This project uses a custom C++ TurboModule (`NativeFFmpegModule`) to call FFmpeg C API functions directly for video processing. All video editing (mute, trim, overlay burn-in) is performed natively for performance and reliability.

### FFmpeg Integration

- FFmpeg is built as `.so` libraries (with `drawtext`/`freetype` support) and included in `android/app/src/main/jni/jnilibs`.
- CMake is configured to link against these libraries and include FFmpeg headers.
- No external FFmpeg binary or CLI is required at runtime.

## Getting Started

1. **Install JS dependencies:**
   ```bash
   npm install
   ```
2. **Build and run on Android:**
   ```bash
   npx expo run:android
   ```
   > **Note:** iOS is not supported for native overlay burn-in (Android only).

### Native Build Requirements

- Android NDK and CMake (configured via Android Studio)
- Prebuilt FFmpeg `.so` libraries for all target ABIs in `jniLibs`
- If you change FFmpeg, rebuild `.so` files and update `jniLibs`

## Usage

1. Launch the app and grant camera/storage permissions.
2. Record a video using the camera preview.
3. Add overlays (emoji/text) and position them as desired.
4. Save/export the video. Overlays will be burned in natively.
5. Find the exported video in your gallery.

## Key Dependencies

- `expo`, `react-native-vision-camera`, `expo-file-system`, `expo-media-library`, `expo-video-thumbnails`
- `react-native-reanimated`, `react-native-gesture-handler` (for overlay gestures)
- Custom C++ TurboModule (see `shared/NativeFFmpegModule.cpp`)

## Troubleshooting

- **Linker errors:** Ensure all required FFmpeg `.so` files are present in `jniLibs` and CMake links to all needed libraries.
- **Font not found:** Font is copied at runtime using Expo Asset API; ensure font file is present in `assets/fonts`.
- **Build errors:** Check CMakeLists.txt for correct include/library paths.

## Credits

- Built by Shivam Pandey for demo/assignment purposes.
- FFmpeg (https://ffmpeg.org/)

---

This project demonstrates robust, native video editing and overlay workflows in React Native/Expo for Android.
