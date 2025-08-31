
import { NativeEventEmitter, NativeModules, Platform } from "react-native";

const { FFmpegModule } = NativeModules;

interface OverlayPosition {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

class FFmpeg {
  /**
   * Trim video only (keep audio)
   * @param inputPath Path to input video
   * @param outputPath Path for processed video
   * @param startTime Start time in seconds
   * @param duration Duration in seconds
   */
  trimVideo(
    inputPath: string,
    outputPath: string,
    startTime: number,
    duration: number
  ): Promise<string> {
    return FFmpegModule.trimVideo(
      inputPath,
      outputPath,
      startTime,
      duration
    );
  }
  private eventEmitter: NativeEventEmitter;

  constructor() {
    this.eventEmitter = new NativeEventEmitter(FFmpegModule);
  }

  /**
   * Trim video and remove audio
   * @param inputPath Path to input video
   * @param outputPath Path for processed video
   * @param startTime Start time in seconds
   * @param duration Duration in seconds
   */
  trimVideoAndMute(
    inputPath: string,
    outputPath: string,
    startTime: number,
    duration: number
  ): Promise<string> {
    return FFmpegModule.trimVideoAndMute(
      inputPath,
      outputPath,
      startTime,
      duration
    );
  }

  /**
   * Generate thumbnail from video
   * @param videoPath Path to video file
   * @param thumbnailPath Path to save thumbnail
   */
  generateThumbnail(videoPath: string, thumbnailPath: string): Promise<string> {
    return FFmpegModule.generateThumbnail(videoPath, thumbnailPath);
  }

  /**
   * Add overlay to video with transformation
   * @param videoPath Path to video file
   * @param overlayPath Path to overlay image/emoji
   * @param outputPath Path to save result
   * @param position Position and transformation of overlay
   */
  addOverlay(
    videoPath: string,
    overlayPath: string,
    outputPath: string,
    position: OverlayPosition
  ): Promise<string> {
    return FFmpegModule.addOverlay(
      videoPath,
      overlayPath,
      outputPath,
      position.x,
      position.y,
      position.scale,
      position.rotation
    );
  }

  /**
   * Add a listener for FFmpeg progress events
   * @param callback Function to call with progress updates
   * @returns Cleanup function to remove the listener
   */
  addProgressListener(callback: (progress: number) => void) {
    const subscription = this.eventEmitter.addListener(
      "FFmpegProgress",
      (event: { progress: number }) => {
        callback(event.progress);
      }
    );

    return () => subscription.remove();
  }

  /**
   * Example method to compress a video
   * @param inputPath Path to input video
   * @param outputPath Path to save compressed video
   * @param options Compression options
   * @returns Promise that resolves when compression completes
   */
  async compressVideo(
    inputPath: string,
    outputPath: string,
    options = { crf: 28, preset: "faster" }
  ): Promise<string> {
    const command = Platform.select({
      android: `-i ${inputPath} -c:v libx264 -crf ${options.crf} -preset ${options.preset} -c:a aac -b:a 128k ${outputPath}`,
      ios: `-i ${inputPath} -c:v h264 -crf ${options.crf} -preset ${options.preset} -c:a aac -b:a 128k ${outputPath}`,
    });

    if (!command) {
      throw new Error("Unsupported platform");
    }

    return this.executeCommand(command);
  }
  
}


export default new FFmpeg();
