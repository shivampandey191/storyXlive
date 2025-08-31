#include "NativeFFmpegModule.h"
#include <android/log.h>
#include <sstream>

namespace facebook::react {

NativeFFmpegModule::NativeFFmpegModule(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeFFmpegModuleCxxSpec(std::move(jsInvoker)) {}

std::string NativeFFmpegModule::getFFmpegVersion(jsi::Runtime& rt) {
    return av_version_info();   
}

std::string NativeFFmpegModule::getVideoMetaData(jsi::Runtime& rt, std::string filePath) { 
    AVFormatContext *formatContext = nullptr;
    int ret = avformat_open_input(&formatContext, filePath.c_str(), nullptr, nullptr); 
    if (ret < 0) {
       return "Failed to open input file";
    }


    ret = avformat_find_stream_info(formatContext, nullptr);
    if (ret < 0) {
        avformat_close_input(&formatContext);
        return "Failed to find stream info";
    }
    int64_t duration = formatContext->duration;
    if (duration == AV_NOPTS_VALUE) {
        duration = 0;
    }
    double durationInSeconds = std::abs(static_cast<double>(duration) / AV_TIME_BASE);

    std::ostringstream out;
    out << "Format: " << formatContext->iformat->name << "\n";
    out << "Duration: " << durationInSeconds << " seconds\n";
    out << "Bit rate: " << (formatContext->bit_rate / 1000) << " kb/s\n";
    out << "Streams: " << formatContext->nb_streams;

    avformat_close_input(&formatContext);
    return out.str();
}

} // namespace facebook::react