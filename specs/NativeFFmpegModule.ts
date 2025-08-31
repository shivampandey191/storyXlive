import { TurboModule, TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  readonly getFFmpegVersion: () => string;
  readonly getVideoMetaData: (filePath:string) => string;
}

export default TurboModuleRegistry.getEnforcing<Spec>("NativeFFmpegModule");
