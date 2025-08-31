
package com.storylive.ffmpeg;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;


import java.io.File;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

// FFmpegKit imports
import com.arthenica.ffmpegkit.FFmpegKit;
import com.arthenica.ffmpegkit.Session;
import com.arthenica.ffmpegkit.ReturnCode;

public class FFmpegModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private final ExecutorService executorService;

    public FFmpegModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.executorService = Executors.newSingleThreadExecutor();
    }

    @Override
    public String getName() {
        return "FFmpegModule";
    }

    private void sendProgress(float progress) {
        WritableMap params = Arguments.createMap();
        params.putDouble("progress", progress);
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit("FFmpegProgress", params);
    }

    @ReactMethod
    public void trimVideoAndMute(String inputPath, String outputPath, int startTime, int duration, Promise promise) {
        executorService.execute(() -> {
            try {
                // FFmpeg command to trim video and mute audio
                String command = String.format("-i %s -ss %d -t %d -c:v copy -an %s",
                    inputPath,    // Input file
                    startTime,    // Start time in seconds
                    duration,     // Duration in seconds
                    outputPath    // Output file
                );

                Session session = FFmpegKit.execute(command);
                if (ReturnCode.isSuccess(session.getReturnCode())) {
                    promise.resolve("Video processed successfully");
                } else {
                    promise.reject("FFMPEG_ERROR", "FFmpeg process failed with rc=" + session.getReturnCode());
                }
            } catch (Exception e) {
                promise.reject("FFMPEG_ERROR", e.getMessage());
            }
        });
    }

    @ReactMethod
    public void generateThumbnail(String videoPath, String thumbnailPath, Promise promise) {
        executorService.execute(() -> {
            try {
                // FFmpeg command to extract a frame as thumbnail
                String command = String.format("-i %s -ss 0 -vframes 1 -f image2 %s",
                    videoPath,      // Input video
                    thumbnailPath   // Output thumbnail path
                );

                Session session = FFmpegKit.execute(command);
                if (ReturnCode.isSuccess(session.getReturnCode())) {
                    promise.resolve("Thumbnail generated successfully");
                } else {
                    promise.reject("FFMPEG_ERROR", "Thumbnail generation failed with rc=" + session.getReturnCode());
                }
            } catch (Exception e) {
                promise.reject("FFMPEG_ERROR", e.getMessage());
            }
        });
    }

    @ReactMethod
    public void addOverlay(String videoPath, String overlayPath, String outputPath, 
                          int x, int y, float scale, float rotation, Promise promise) {
        executorService.execute(() -> {
            try {
                // FFmpeg command to add overlay with transformation
                String command = String.format(
                    "-i %s -i %s -filter_complex " +
                    "[1:v]scale=%f:-1,rotate=%f:c=none:ow=rotw(%f):oh=roth(%f)[overlay];" +
                    "[0:v][overlay]overlay=%d:%d" +
                    " -c:v libx264 -preset ultrafast %s",
                    videoPath,    // Main video
                    overlayPath,  // Overlay image
                    scale,        // Scale factor
                    rotation,     // Rotation angle
                    rotation,     // Rotation width calculation
                    rotation,     // Rotation height calculation
                    x,           // X position
                    y,           // Y position
                    outputPath   // Output file
                );

                Session session = FFmpegKit.execute(command);
                if (ReturnCode.isSuccess(session.getReturnCode())) {
                    promise.resolve("Overlay added successfully");
                } else {
                    promise.reject("FFMPEG_ERROR", "Overlay addition failed with rc=" + session.getReturnCode());
                }
            } catch (Exception e) {
                promise.reject("FFMPEG_ERROR", e.getMessage());
            }
        });
    }

    @ReactMethod
    public void trimVideo(String inputPath, String outputPath, int startTime, int duration, Promise promise) {
        executorService.execute(() -> {
            try {
                // FFmpeg command to trim video and keep audio
                String command = String.format("-i %s -ss %d -t %d -c:v copy -c:a copy %s",
                    inputPath,    // Input file
                    startTime,    // Start time in seconds
                    duration,     // Duration in seconds
                    outputPath    // Output file
                );

                Session session = FFmpegKit.execute(command);
                if (ReturnCode.isSuccess(session.getReturnCode())) {
                    promise.resolve("Video trimmed successfully");
                } else {
                    promise.reject("FFMPEG_ERROR", "FFmpeg process failed with rc=" + session.getReturnCode());
                }
            } catch (Exception e) {
                promise.reject("FFMPEG_ERROR", e.getMessage());
            }
        });
    }

    @ReactMethod
    public void addListener(String eventName) {
        // Required for RN built in Event Emitter
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        // Required for RN built in Event Emitter
    }
}
