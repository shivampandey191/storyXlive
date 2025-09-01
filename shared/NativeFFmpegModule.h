#pragma once

#include <AppSpecsJSI.h>

#include <memory>
#include <string>

extern "C" {
#include <libavformat/avformat.h>
#include <libavutil/avutil.h>
}

namespace facebook::react {


class NativeFFmpegModule : public NativeFFmpegModuleCxxSpec<NativeFFmpegModule> {
public:
  NativeFFmpegModule(std::shared_ptr<CallInvoker> jsInvoker);

  std::string getFFmpegVersion(jsi::Runtime& rt);
  std::string getVideoMetaData(jsi::Runtime& rt, std::string filePath);

  // New methods
  bool muteVideo(jsi::Runtime& rt, std::string inputPath, std::string outputPath);
  bool trimLast2Seconds(jsi::Runtime& rt, std::string inputPath, std::string outputPath);
  bool trimVideo(jsi::Runtime& rt, std::string inputPath, std::string outputPath, double start, double duration);
  bool burnOverlays(jsi::Runtime& rt, std::string inputPath, std::string outputPath, std::string overlaysJson, std::string workDir);
};

} // namespace facebook::react
