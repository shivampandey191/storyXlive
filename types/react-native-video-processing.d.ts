declare module "react-native-video-processing" {
  export interface CompressOptions {
    width?: number;
    height?: number;
    bitrateMultiplier?: number;
    minimumBitrate?: number;
    quality?: "low" | "medium" | "high";
  }

  export interface TrimOptions {
    startTime: number;
    endTime: number;
    quality?: "low" | "medium" | "high";
  }

  export interface ThumbnailOptions {
    quality?: "low" | "medium" | "high";
    interval?: number;
  }

  export class ProcessingManager {
    static compress(source: string, options?: CompressOptions): Promise<string>;
    static trim(source: string, options: TrimOptions): Promise<string>;
    static getPreviewForSecond(
      source: string,
      options?: ThumbnailOptions
    ): Promise<string>;
  }
}
