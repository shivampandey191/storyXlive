// Trim video (with audio)
export async function trimVideo(
  inputPath: string,
  outputPath: string,
  startTime: number,
  duration: number
): Promise<string> {
  return FFmpegModule.trimVideo(inputPath, outputPath, startTime, duration);
}
import { NativeModules } from "react-native";

const { FFmpegModule } = NativeModules;

// Mute video (remove audio track)
export async function muteVideo(
  inputPath: string,
  outputPath: string
): Promise<boolean> {
  // Use trimVideoAndMute from the Java module
  try {
    await FFmpegModule.trimVideoAndMute(inputPath, outputPath, 0, 0); // 0,0 means full video, just mute
    return true;
  } catch (e) {
    return false;
  }
}

// Burn overlays (drawtext for each overlay in overlaysJson)
// Not implemented in Java module, so return false for now or implement if needed
export async function burnOverlays(
  inputPath: string,
  outputPath: string,
  overlaysJson: string,
  workDir: string
): Promise<boolean> {
  // You would need to add a method to FFmpegModule.java to support overlay burn-in from JS
  return false;
}
