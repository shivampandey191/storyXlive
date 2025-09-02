
#include "NativeFFmpegModule.h"
#include <android/log.h>
#include <sstream>

// FFmpeg includes (ensure all needed are present)
extern "C" {
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavfilter/avfilter.h>
#include <libavfilter/buffersink.h>
#include <libavfilter/buffersrc.h>
#include <libavutil/opt.h>
#include <libavutil/imgutils.h>
#include <libavutil/pixdesc.h>
#include <libavutil/mathematics.h>
#include <libavutil/timestamp.h>
#include <libswscale/swscale.h>
}

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
    __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "burnOverlays: entered");

    // --- FFmpeg C API overlay scaffold ---
    // 1. Open input file
    AVFormatContext* fmt_ctx = nullptr;
    if (avformat_open_input(&fmt_ctx, inputPath.c_str(), nullptr, nullptr) < 0) {
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Failed to open input: %s", inputPath.c_str());
        return false;
    }
    __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Input opened: %s", inputPath.c_str());
    if (avformat_find_stream_info(fmt_ctx, nullptr) < 0) {
        avformat_close_input(&fmt_ctx);
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Failed to find stream info");
        return false;
    }
    __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Stream info found");
    int video_stream_index = -1;
    for (unsigned int i = 0; i < fmt_ctx->nb_streams; i++) {
        if (fmt_ctx->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
            video_stream_index = i;
            break;
        }
    }
    if (video_stream_index == -1) {
        avformat_close_input(&fmt_ctx);
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "No video stream found");
        return false;
    }
    __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Video stream index: %d", video_stream_index);

    // 2. Set up decoder
    const AVCodec* dec = avcodec_find_decoder(fmt_ctx->streams[video_stream_index]->codecpar->codec_id);
    if (!dec) {
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Decoder not found");
        avformat_close_input(&fmt_ctx);
        return false;
    }
    AVCodecContext* dec_ctx = avcodec_alloc_context3(dec);
    if (!dec_ctx) {
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Failed to alloc decoder context");
        avformat_close_input(&fmt_ctx);
        return false;
    }
    if (avcodec_parameters_to_context(dec_ctx, fmt_ctx->streams[video_stream_index]->codecpar) < 0) {
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Failed to copy codec params to context");
        avcodec_free_context(&dec_ctx);
        avformat_close_input(&fmt_ctx);
        return false;
    }
    if (avcodec_open2(dec_ctx, dec, nullptr) < 0) {
        avcodec_free_context(&dec_ctx);
        avformat_close_input(&fmt_ctx);
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Failed to open decoder");
        return false;
    }
    __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Decoder opened");

    // 3. Build filter string from overlaysJson (reuse your logic)
    std::string fontPath = workDir + "/SpaceMono-Regular.ttf";
    std::vector<std::string> filterParts;
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
            if ((type == "emoji" || type == "text") && !fontPath.empty()) {
                // Clean up font path (remove double slashes)
                std::string cleanFontPath = fontPath;
                while (cleanFontPath.find("//") != std::string::npos) {
                    cleanFontPath.replace(cleanFontPath.find("//"), 2, "/");
                }
                std::ostringstream f;
                f << "drawtext=text='" << content << "'";
                // Cast x/y to int for FFmpeg drawtext
                if (x.empty()) {
                    f << ":x=0";
                } else {
                    try {
                        f << ":x=" << std::to_string(static_cast<int>(std::stof(x)));
                    } catch (...) {
                        f << ":x=0";
                    }
                }
                if (y.empty()) {
                    f << ":y=0";
                } else {
                    try {
                        f << ":y=" << std::to_string(static_cast<int>(std::stof(y)));
                    } catch (...) {
                        f << ":y=0";
                    }
                }
                f << ":fontsize=" << (scale.empty() ? "40" : std::to_string((int)(std::stof(scale)*40)));
                f << ":fontcolor=white";
                f << ":fontfile='" << cleanFontPath << "'";
                filterParts.push_back(f.str());
            }
            pos = end+1;
        }
    } catch (...) {
        avcodec_free_context(&dec_ctx);
        avformat_close_input(&fmt_ctx);
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Overlay JSON parse error");
        return false;
    }
    if (filterParts.empty()) {
        avcodec_free_context(&dec_ctx);
        avformat_close_input(&fmt_ctx);
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "No overlays or font not found");
        return false;
    }
    std::ostringstream filter;
    for (size_t i = 0; i < filterParts.size(); ++i) {
        if (i > 0) filter << ",";
        filter << filterParts[i];
    }

    // 4. Set up filter graph
    AVFilterGraph* filter_graph = avfilter_graph_alloc();
    AVFilterContext* buffersrc_ctx = nullptr;
    AVFilterContext* buffersink_ctx = nullptr;
    char args[512];
    snprintf(args, sizeof(args),
        "video_size=%dx%d:pix_fmt=%d:time_base=%d/%d:pixel_aspect=%d/%d",
        dec_ctx->width, dec_ctx->height, dec_ctx->pix_fmt,
        fmt_ctx->streams[video_stream_index]->time_base.num,
        fmt_ctx->streams[video_stream_index]->time_base.den,
        dec_ctx->sample_aspect_ratio.num, dec_ctx->sample_aspect_ratio.den);
    avfilter_graph_create_filter(&buffersrc_ctx, avfilter_get_by_name("buffer"), "in", args, nullptr, filter_graph);
    avfilter_graph_create_filter(&buffersink_ctx, avfilter_get_by_name("buffersink"), "out", nullptr, nullptr, filter_graph);
    AVFilterInOut* outputs = avfilter_inout_alloc();
    AVFilterInOut* inputs  = avfilter_inout_alloc();
    outputs->name       = av_strdup("in");
    outputs->filter_ctx = buffersrc_ctx;
    outputs->pad_idx    = 0;

    // Log the filter string before parsing
    __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Filter string: %s", filter.str().c_str());
    outputs->next       = nullptr;
    inputs->name        = av_strdup("out");
    inputs->filter_ctx  = buffersink_ctx;
    inputs->pad_idx     = 0;
    inputs->next        = nullptr;
    int parse_ret = avfilter_graph_parse_ptr(filter_graph, filter.str().c_str(), &inputs, &outputs, nullptr);
    if (parse_ret < 0) {
        char errbuf[256];
        av_strerror(parse_ret, errbuf, sizeof(errbuf));
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Failed to parse filter graph: %s", errbuf);
        avfilter_inout_free(&inputs);
        avfilter_inout_free(&outputs);
        avfilter_graph_free(&filter_graph);
        avcodec_free_context(&dec_ctx);
        avformat_close_input(&fmt_ctx);
        return false;
    }
    if (avfilter_graph_config(filter_graph, nullptr) < 0) {
        avfilter_inout_free(&inputs);
        avfilter_inout_free(&outputs);
        avfilter_graph_free(&filter_graph);
        avcodec_free_context(&dec_ctx);
        avformat_close_input(&fmt_ctx);
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Failed to config filter graph");
        return false;
    }
    avfilter_inout_free(&inputs);
    avfilter_inout_free(&outputs);

    // 5. Read, filter, encode, and mux frames (video only)
    AVFormatContext* out_fmt_ctx = nullptr;
    AVStream* out_stream = nullptr;
    const AVCodec* enc = nullptr;
    AVCodecContext* enc_ctx = nullptr;
    int ret = 0;

    // Create output context
    avformat_alloc_output_context2(&out_fmt_ctx, nullptr, nullptr, outputPath.c_str());
    if (!out_fmt_ctx) {
        avfilter_graph_free(&filter_graph);
        avcodec_free_context(&dec_ctx);
        avformat_close_input(&fmt_ctx);
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Failed to alloc output context");
        return false;
    }
    // Add video stream to output
    enc = avcodec_find_encoder(dec_ctx->codec_id);
    if (!enc) {
        avformat_free_context(out_fmt_ctx);
        avfilter_graph_free(&filter_graph);
        avcodec_free_context(&dec_ctx);
        avformat_close_input(&fmt_ctx);
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Encoder not found");
        return false;
    }
    out_stream = avformat_new_stream(out_fmt_ctx, enc);
    if (!out_stream) {
        avformat_free_context(out_fmt_ctx);
        avfilter_graph_free(&filter_graph);
        avcodec_free_context(&dec_ctx);
        avformat_close_input(&fmt_ctx);
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Failed to create output stream");
        return false;
    }
    enc_ctx = avcodec_alloc_context3(enc);
    enc_ctx->height = dec_ctx->height;
    enc_ctx->width = dec_ctx->width;
    enc_ctx->sample_aspect_ratio = dec_ctx->sample_aspect_ratio;
    // Use decoder's pixel format to avoid deprecated pix_fmts
    enc_ctx->pix_fmt = dec_ctx->pix_fmt;
    enc_ctx->time_base = dec_ctx->time_base;
    if (out_fmt_ctx->oformat->flags & AVFMT_GLOBALHEADER)
        enc_ctx->flags |= AV_CODEC_FLAG_GLOBAL_HEADER;
    if (avcodec_open2(enc_ctx, enc, nullptr) < 0) {
        avcodec_free_context(&enc_ctx);
        avformat_free_context(out_fmt_ctx);
        avfilter_graph_free(&filter_graph);
        avcodec_free_context(&dec_ctx);
        avformat_close_input(&fmt_ctx);
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Failed to open encoder");
        return false;
    }
    ret = avcodec_parameters_from_context(out_stream->codecpar, enc_ctx);
    if (ret < 0) {
        avcodec_free_context(&enc_ctx);
        avformat_free_context(out_fmt_ctx);
        avfilter_graph_free(&filter_graph);
        avcodec_free_context(&dec_ctx);
        avformat_close_input(&fmt_ctx);
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Failed to copy encoder params");
        return false;
    }
    // Open output file
    if (!(out_fmt_ctx->oformat->flags & AVFMT_NOFILE)) {
        if (avio_open(&out_fmt_ctx->pb, outputPath.c_str(), AVIO_FLAG_WRITE) < 0) {
            avcodec_free_context(&enc_ctx);
            avformat_free_context(out_fmt_ctx);
            avfilter_graph_free(&filter_graph);
            avcodec_free_context(&dec_ctx);
            avformat_close_input(&fmt_ctx);
            __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Failed to open output file");
            return false;
        }
    }
    // Write header
    if (avformat_write_header(out_fmt_ctx, nullptr) < 0) {
        avio_closep(&out_fmt_ctx->pb);
        avcodec_free_context(&enc_ctx);
        avformat_free_context(out_fmt_ctx);
        avfilter_graph_free(&filter_graph);
        avcodec_free_context(&dec_ctx);
        avformat_close_input(&fmt_ctx);
        __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Failed to write header");
        return false;
    }

    // Frame processing loop
    AVPacket* pkt = av_packet_alloc();
    AVFrame* frame = av_frame_alloc();
    AVFrame* filt_frame = av_frame_alloc();
    while (av_read_frame(fmt_ctx, pkt) >= 0) {
        if (pkt->stream_index == video_stream_index) {
            ret = avcodec_send_packet(dec_ctx, pkt);
            if (ret < 0) continue;
            while (ret >= 0) {
                ret = avcodec_receive_frame(dec_ctx, frame);
                if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF) break;
                if (ret < 0) break;
                // Push frame to filter
                if (av_buffersrc_add_frame(buffersrc_ctx, frame) < 0) break;
                // Pull filtered frames
                while (av_buffersink_get_frame(buffersink_ctx, filt_frame) >= 0) {
                    // Encode filtered frame
                    ret = avcodec_send_frame(enc_ctx, filt_frame);
                    if (ret < 0) break;
                    AVPacket out_pkt = {0};
                    while (avcodec_receive_packet(enc_ctx, &out_pkt) == 0) {
                        out_pkt.stream_index = out_stream->index;
                        av_packet_rescale_ts(&out_pkt, enc_ctx->time_base, out_stream->time_base);
                        av_interleaved_write_frame(out_fmt_ctx, &out_pkt);
                        av_packet_unref(&out_pkt);
                    }
                    av_frame_unref(filt_frame);
                }
                av_frame_unref(frame);
            }
        }
        av_packet_unref(pkt);
    }
    // Flush encoder
    avcodec_send_frame(enc_ctx, nullptr);
    AVPacket out_pkt = {0};
    while (avcodec_receive_packet(enc_ctx, &out_pkt) == 0) {
        out_pkt.stream_index = out_stream->index;
        av_packet_rescale_ts(&out_pkt, enc_ctx->time_base, out_stream->time_base);
        av_interleaved_write_frame(out_fmt_ctx, &out_pkt);
        av_packet_unref(&out_pkt);
    }
    av_write_trailer(out_fmt_ctx);

    // Cleanup
    av_frame_free(&frame);
    av_frame_free(&filt_frame);
    av_packet_free(&pkt);
    if (!(out_fmt_ctx->oformat->flags & AVFMT_NOFILE))
        avio_closep(&out_fmt_ctx->pb);
    avcodec_free_context(&enc_ctx);
    avformat_free_context(out_fmt_ctx);
    avfilter_graph_free(&filter_graph);
    avcodec_free_context(&dec_ctx);
    avformat_close_input(&fmt_ctx);
    __android_log_print(ANDROID_LOG_ERROR, "FFmpegModule", "Overlay C API: Success");
    return true;
}

}