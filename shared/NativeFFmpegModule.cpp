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

bool NativeFFmpegModule::muteVideo(jsi::Runtime& rt, std::string inputPath, std::string outputPath) {
    // Remove file:// prefix if present
    if (inputPath.rfind("file://", 0) == 0) inputPath = inputPath.substr(7);
    if (outputPath.rfind("file://", 0) == 0) outputPath = outputPath.substr(7);
    AVFormatContext* inFmtCtx = nullptr;
    AVFormatContext* outFmtCtx = nullptr;
    bool success = false;

    if (avformat_open_input(&inFmtCtx, inputPath.c_str(), nullptr, nullptr) < 0) return false;
    if (avformat_find_stream_info(inFmtCtx, nullptr) < 0) goto end;

    avformat_alloc_output_context2(&outFmtCtx, nullptr, nullptr, outputPath.c_str());
    if (!outFmtCtx) goto end;

    // Copy only video streams
    for (unsigned int i = 0; i < inFmtCtx->nb_streams; i++) {
        if (inFmtCtx->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
            AVStream* outStream = avformat_new_stream(outFmtCtx, nullptr);
            if (!outStream) goto end;
            if (avcodec_parameters_copy(outStream->codecpar, inFmtCtx->streams[i]->codecpar) < 0) goto end;
            outStream->codecpar->codec_tag = 0;
        }
    }

    if (!(outFmtCtx->oformat->flags & AVFMT_NOFILE)) {
        if (avio_open(&outFmtCtx->pb, outputPath.c_str(), AVIO_FLAG_WRITE) < 0) goto end;
    }

    if (avformat_write_header(outFmtCtx, nullptr) < 0) goto end;

    AVPacket pkt;
    while (av_read_frame(inFmtCtx, &pkt) >= 0) {
        if (inFmtCtx->streams[pkt.stream_index]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
            pkt.stream_index = 0; // Only one video stream in output
            av_interleaved_write_frame(outFmtCtx, &pkt);
        }
        av_packet_unref(&pkt);
    }

    av_write_trailer(outFmtCtx);
    success = true;

end:
    if (inFmtCtx) avformat_close_input(&inFmtCtx);
    if (outFmtCtx) {
        if (!(outFmtCtx->oformat->flags & AVFMT_NOFILE)) avio_closep(&outFmtCtx->pb);
        avformat_free_context(outFmtCtx);
    }
    return success;
}

bool NativeFFmpegModule::trimLast2Seconds(jsi::Runtime& rt, std::string inputPath, std::string outputPath) {
    // Remove file:// prefix if present
    if (inputPath.rfind("file://", 0) == 0) inputPath = inputPath.substr(7);
    if (outputPath.rfind("file://", 0) == 0) outputPath = outputPath.substr(7);
    // Get duration using FFmpeg/libav
    AVFormatContext *formatContext = nullptr;
    int ret = avformat_open_input(&formatContext, inputPath.c_str(), nullptr, nullptr);
    if (ret < 0) return false;
    ret = avformat_find_stream_info(formatContext, nullptr);
    if (ret < 0) {
        avformat_close_input(&formatContext);
        return false;
    }
    int64_t duration = formatContext->duration;
    avformat_close_input(&formatContext);
    if (duration == AV_NOPTS_VALUE) return false;
    double durationInSeconds = std::abs(static_cast<double>(duration) / AV_TIME_BASE);
    double trimDuration = durationInSeconds - 2.0;
    if (trimDuration <= 0) return false;
    // Use FFmpeg CLI to trim last 2 seconds
    std::string ffmpegPath = "/data/data/com.anonymous.StoryXLive/files/ffmpeg";
    if (access(ffmpegPath.c_str(), X_OK) != 0) {
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "ffmpeg binary not executable or not found at: %s", ffmpegPath.c_str());
    }
    std::ostringstream cmd;
    cmd << ffmpegPath << " -y -i '" << inputPath << "' -ss 0 -t " << trimDuration << " -c copy '" << outputPath << "'";
    int sysret = system(cmd.str().c_str());
    return sysret == 0;
}

bool NativeFFmpegModule::trimVideo(jsi::Runtime& rt, std::string inputPath, std::string outputPath, double start, double duration) {
    // Remove file:// prefix if present
    if (inputPath.rfind("file://", 0) == 0) inputPath = inputPath.substr(7);
    if (outputPath.rfind("file://", 0) == 0) outputPath = outputPath.substr(7);
    AVFormatContext* inFmtCtx = nullptr;
    AVFormatContext* outFmtCtx = nullptr;
    bool success = false;
    int64_t seek_target = 0;
    double endTime = 0;
    AVPacket pkt;

    if (avformat_open_input(&inFmtCtx, inputPath.c_str(), nullptr, nullptr) < 0) return false;
    if (avformat_find_stream_info(inFmtCtx, nullptr) < 0) goto end;

    avformat_alloc_output_context2(&outFmtCtx, nullptr, nullptr, outputPath.c_str());
    if (!outFmtCtx) goto end;

    // Copy all streams
    for (unsigned int i = 0; i < inFmtCtx->nb_streams; i++) {
        AVStream* outStream = avformat_new_stream(outFmtCtx, nullptr);
        if (!outStream) goto end;
        if (avcodec_parameters_copy(outStream->codecpar, inFmtCtx->streams[i]->codecpar) < 0) goto end;
        outStream->codecpar->codec_tag = 0;
    }

    if (!(outFmtCtx->oformat->flags & AVFMT_NOFILE)) {
        if (avio_open(&outFmtCtx->pb, outputPath.c_str(), AVIO_FLAG_WRITE) < 0) goto end;
    }

    if (avformat_write_header(outFmtCtx, nullptr) < 0) goto end;

    // Seek to start
    seek_target = start * AV_TIME_BASE;
    if (av_seek_frame(inFmtCtx, -1, seek_target, AVSEEK_FLAG_BACKWARD) < 0) goto end;

    endTime = start + duration;
    while (av_read_frame(inFmtCtx, &pkt) >= 0) {
        double pkt_time = pkt.pts * av_q2d(inFmtCtx->streams[pkt.stream_index]->time_base);
        if (pkt_time < start) {
            av_packet_unref(&pkt);
            continue;
        }
        if (pkt_time > endTime) {
            av_packet_unref(&pkt);
            break;
        }
        av_interleaved_write_frame(outFmtCtx, &pkt);
        av_packet_unref(&pkt);
    }

    av_write_trailer(outFmtCtx);
    success = true;

end:
    if (inFmtCtx) avformat_close_input(&inFmtCtx);
    if (outFmtCtx) {
        if (!(outFmtCtx->oformat->flags & AVFMT_NOFILE)) avio_closep(&outFmtCtx->pb);
        avformat_free_context(outFmtCtx);
    }
    return success;
}

bool NativeFFmpegModule::burnOverlays(jsi::Runtime& rt, std::string inputPath, std::string outputPath, std::string overlaysJson, std::string workDir) {
    // Logcat: entry and all key steps
    __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "burnOverlays called");
    __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "workDir: %s", workDir.c_str());
    __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "inputPath: %s", inputPath.c_str());
    __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "outputPath: %s", outputPath.c_str());
    __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "overlaysJson: %s", overlaysJson.c_str());

    std::string fontPath = workDir + "/SpaceMono-Regular.ttf";
    FILE* fontTest = fopen(fontPath.c_str(), "r");
    if (!fontTest) {
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Font file not found: %s", fontPath.c_str());
        fontPath = "";
    } else {
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Font file found: %s", fontPath.c_str());
        fclose(fontTest);
    }
    // Remove file:// prefix if present
    if (inputPath.rfind("file://", 0) == 0) inputPath = inputPath.substr(7);
    if (outputPath.rfind("file://", 0) == 0) outputPath = outputPath.substr(7);

    // Use workDir for font and logs (ensure font is copied to workDir/SpaceMono-Regular.ttf)
    std::vector<std::string> filterParts;
    // (Removed duplicate fontPath/fontTest definition)

    try {
        size_t pos = 0;
        while ((pos = overlaysJson.find("{", pos)) != std::string::npos) {
            size_t end = overlaysJson.find("}", pos);
            if (end == std::string::npos) break;
            std::string obj = overlaysJson.substr(pos, end - pos + 1);
            auto getVal = [&](const std::string& key) -> std::string {
                size_t k = obj.find('"' + key + '"');
                if (k == std::string::npos) return "";
                size_t c = obj.find(":", k);
                if (c == std::string::npos) return "";
                size_t v1 = obj.find_first_of("\"0123456789-", c+1);
                if (v1 == std::string::npos) return "";
                if (obj[v1] == '"') {
                    size_t v2 = obj.find('"', v1+1);
                    return obj.substr(v1+1, v2-v1-1);
                } else {
                    size_t v2 = obj.find_first_of(",}", v1);
                    return obj.substr(v1, v2-v1);
                }
            };
            std::string type = getVal("type");
            std::string content = getVal("content");
            std::string x = getVal("x");
            std::string y = getVal("y");
            std::string scale = getVal("scale");
            std::string rotation = getVal("rotation");
            if ((type == "emoji" || type == "text") && !fontPath.empty()) {
                std::ostringstream f;
                f << "drawtext=text='" << content << "'";
                f << ":x=" << (x.empty() ? "0" : x);
                f << ":y=" << (y.empty() ? "0" : y);
                f << ":fontsize=" << (scale.empty() ? "40" : std::to_string((int)(std::stof(scale)*40)));
                f << ":fontcolor=white";
                f << ":fontfile='" << fontPath << "'";
                filterParts.push_back(f.str());
                __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Added overlay: %s", f.str().c_str());
            }
            pos = end+1;
        }
    } catch (...) {
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Overlay JSON parse error");
        return false;
    }
    if (filterParts.empty()) {
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "No overlays or font not found");
        return false;
    }
    std::ostringstream filter;
    for (size_t i = 0; i < filterParts.size(); ++i) {
        if (i > 0) filter << ",";
        filter << filterParts[i];
    }
    __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "FFmpeg filter: %s", filter.str().c_str());
    std::string ffmpegPath = "/data/data/com.anonymous.StoryXLive/files/ffmpeg";
    if (access(ffmpegPath.c_str(), X_OK) != 0) {
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "ffmpeg binary not executable or not found at: %s", ffmpegPath.c_str());
    }
    std::ostringstream cmd;
    std::string logPath = workDir + "/ffmpeg_overlay_cmd.log";
    std::string errPath = workDir + "/ffmpeg_overlay_stderr.log";
    cmd << ffmpegPath << " -y -i '" << inputPath << "' -vf \"" << filter.str() << "\" -codec:a copy '" << outputPath << "' 2>" << errPath;
    __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "FFmpeg command: %s", cmd.str().c_str());
    int sysret = system(cmd.str().c_str());
    __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "FFmpeg system() returned: %d", sysret);
    if (sysret != 0) {
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "FFmpeg command failed");
    }
    return sysret == 0;
}

}