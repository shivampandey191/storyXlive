import { Video } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as VideoThumbnails from "expo-video-thumbnails";

class VideoProcessor {
  /**
   * Generate a thumbnail from a video file
   * @param videoUri Path to the video file
   * @returns Promise with the thumbnail URI
   */
  static async generateThumbnail(videoUri: string): Promise<string> {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 0, // Get thumbnail from first frame
      });
      return uri;
    } catch (error) {
      console.error("Failed to generate thumbnail:", error);
      throw error;
    }
  }

  /**
   * Process the video (trim and mute)
   * @param videoUri Path to the video file
   * @returns Promise with the processed video URI
   */
  static async processVideo(videoUri: string): Promise<string> {
    try {
      const timestamp = Date.now();
      const newFileName = `processed_${timestamp}.mp4`;
      const processedUri = `${FileSystem.cacheDirectory}${newFileName}`;

      await FileSystem.copyAsync({
        from: videoUri,
        to: processedUri,
      });

      const { status } = await Video.createAsync(
        { uri: processedUri },
        { progressUpdateIntervalMillis: 1000 },
        false
      );
      return processedUri;
    } catch (error) {
      console.error("Failed to process video:", error);
      throw error;
    }
  }

  /**
   * Save overlay position for later rendering
   * @param position Overlay position data
   */
  static async saveOverlayData(
    videoUri: string,
    position: {
      x: number;
      y: number;
      scale: number;
      rotation: number;
      type: "emoji" | "text";
      content: string;
    }
  ): Promise<void> {
    try {
      const metadataUri = videoUri.replace(".mp4", "_metadata.json");
      await FileSystem.writeAsStringAsync(
        metadataUri,
        JSON.stringify(position)
      );
    } catch (error) {
      console.error("Failed to save overlay data:", error);
      throw error;
    }
  }

  /**
   * Get overlay data for a video
   * @param videoUri Path to the video file
   */
  static async getOverlayData(videoUri: string) {
    try {
      const metadataUri = videoUri.replace(".mp4", "_metadata.json");
      const metadata = await FileSystem.readAsStringAsync(metadataUri);
      return JSON.parse(metadata);
    } catch (error) {
      console.error("Failed to read overlay data:", error);
      return null;
    }
  }
}

export default VideoProcessor;
