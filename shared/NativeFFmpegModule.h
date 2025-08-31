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
};

} // namespace facebook::react
