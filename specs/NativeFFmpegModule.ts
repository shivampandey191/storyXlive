import { TurboModule, TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  readonly getFFmpegVersion: () => string;
  readonly getVideoMetaData: (filePath: string) => string;
  readonly muteVideo: (inputPath: string, outputPath: string) => boolean;
  readonly trimLast2Seconds: (inputPath: string, outputPath: string) => boolean;
  readonly trimVideo: (
    inputPath: string,
    outputPath: string,
    start: number,
    duration: number
  ) => boolean;
  readonly burnOverlays: (
    inputPath: string,
    outputPath: string,
    overlaysJson: string,
    workDir: string
  ) => boolean;
}

export default TurboModuleRegistry.getEnforcing<Spec>("NativeFFmpegModule");
