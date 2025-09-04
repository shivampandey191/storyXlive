import type { OverlayItem } from "@/components/OverlaySystem";
import OverlaySystem from "@/components/OverlaySystem";
import RecordingControls from "@/components/RecordingControls";
import { burnOverlays, muteVideo, trimVideo } from "@/utils/FFmpeg";
import { saveVideoToGallery } from "@/utils/videoProcessing";
import { Asset } from "expo-asset";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import { StatusBar } from "expo-status-bar";
import * as VideoThumbnails from "expo-video-thumbnails";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Dimensions,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";

const { width, height } = Dimensions.get("window");

export default function HomeScreen() {
  // Timer ref for auto-stop
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [overlays, setOverlays] = useState<OverlayItem[]>([]); // Overlay state for video overlays
  // Remove hasReceivedFrame, use minimum recording time instead
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(
    null
  );

  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();

  const recordButtonScale = useSharedValue(1);

  // const [video, setVideo] = useState<MediaLibrary.Asset | null>(null);

  useEffect(() => {
    (async () => {
      if (!hasPermission) {
        await requestPermission();
      }
      const { status: micStatus } = await Audio.requestPermissionsAsync();
      if (micStatus !== "granted") {
        alert("Microphone permission is required for recording audio!");
      }
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access media library is required!");
      }
    })();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        setIsActive(true);
        setIsCameraReady(true);
      } else {
        setIsActive(false);
        // Only stop recording if at least 1 second has passed
        if (
          isRecording &&
          recordingStartTime &&
          Date.now() - recordingStartTime >= 1000
        ) {
          handleStopRecording();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isRecording, recordingStartTime]);

  const handleStartRecording = async () => {
    // Clear any previous timer
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    setRecordingStartTime(null); // Reset before starting recording
    if (!cameraRef.current) {
      console.error("Camera ref is null");
      return;
    }

    if (!isCameraReady) {
      console.error("Camera is not ready");
      Alert.alert("Error", "Camera is not ready yet");
      return;
    }

    try {
      if (!device) {
        console.error("No camera device selected");
        return;
      }

      console.log("Camera state check passed, starting recording...");
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await cameraRef.current.startRecording({
        onRecordingFinished: async (video) => {
          // Clear auto-stop timer
          if (autoStopTimerRef.current) {
            clearTimeout(autoStopTimerRef.current);
            autoStopTimerRef.current = null;
          }
          try {
            // Trim last 2 seconds: keep first (duration - 2) seconds
            const trimmedPath = `${
              FileSystem.cacheDirectory
            }trimmed_${Date.now()}.mp4`;
            const start = 0;
            const duration = Math.max(1, Math.round(video.duration - 2));
            console.log("Original video duration:", video.duration);
            console.log("Trim start:", start, "duration:", duration);
            const trimSuccess = await trimVideo(
              video.path,
              trimmedPath,
              start,
              duration
            );
            const trimmedInfo = await FileSystem.getInfoAsync(trimmedPath);
            console.log("Trimmed file info:", trimmedInfo);
            if (
              !trimSuccess ||
              !trimmedInfo.exists ||
              trimmedInfo.size < 10000
            ) {
              throw new Error("Trimming failed or output file invalid");
            }

            //Mute the trimmed video
            const mutedPath = `${
              FileSystem.cacheDirectory
            }muted_${Date.now()}.mp4`;
            const muteSuccess = await muteVideo(trimmedPath, mutedPath);
            const mutedInfo = await FileSystem.getInfoAsync(mutedPath);
            console.log("Muted file info:", mutedInfo);
            if (!muteSuccess || !mutedInfo.exists || mutedInfo.size < 10000) {
              throw new Error("Muting failed or output file invalid");
            }

            // Ensure font is present in cache directory before calling native
            const overlayedPath = `${
              FileSystem.cacheDirectory
            }overlayed_${Date.now()}.mp4`;
            const overlaysJson = JSON.stringify(overlays);
            const workDir =
              FileSystem.cacheDirectory?.replace("file://", "") ||
              "/data/data/com.storyxlive/cache/";
            const fontDest =
              FileSystem.cacheDirectory + "SpaceMono-Regular.ttf";
            let fontInfo = await FileSystem.getInfoAsync(fontDest);
            if (!fontInfo.exists) {
              // Use Expo Asset API for robust font copying
              const fontAsset = Asset.fromModule(
                require("../assets/fonts/SpaceMono-Regular.ttf")
              );
              await fontAsset.downloadAsync();
              try {
                await FileSystem.copyAsync({
                  from: fontAsset.localUri!,
                  to: fontDest,
                });
                console.log("Font copied to cache:", fontDest);
              } catch (e) {
                console.log("Font copy failed:", e);
              }
              fontInfo = await FileSystem.getInfoAsync(fontDest);
            }
            console.log("Font exists in cache:", fontInfo.exists, fontDest);
            const burnSuccess = await burnOverlays(
              mutedPath,
              overlayedPath,
              overlaysJson,
              workDir
            );
            const overlayedInfo = await FileSystem.getInfoAsync(overlayedPath);
            console.log("Overlayed file info:", overlayedInfo);
            let finalVideoPath = overlayedPath;
            let overlayed = true;
            if (
              !burnSuccess ||
              !overlayedInfo.exists ||
              overlayedInfo.size < 10000
            ) {
              Alert.alert(
                "Overlay Burn-in Failed",
                `Overlay burn-in failed.\n\nSaving trimmed and muted video instead.\n\nOverlays: ${overlaysJson}`
              );
              finalVideoPath = mutedPath;
              overlayed = false;
            }

            // Step 4: Save to gallery (either overlayed or just muted/trimmed)
            const finalInfo = await FileSystem.getInfoAsync(finalVideoPath);
            console.log("Final video file info:", finalInfo);
            if (!finalInfo.exists || finalInfo.size < 10000) {
              throw new Error(
                "Final video file does not exist or is too small"
              );
            }
            await saveVideoToGallery(finalVideoPath);

            // Step 5: Generate thumbnail
            const { uri: thumbnailUri } =
              await VideoThumbnails.getThumbnailAsync(finalVideoPath, {
                time: 0,
              });

            Alert.alert(
              overlayed ? "Success" : "Partial Success",
              overlayed
                ? "Video processed, overlays burned, saved, and thumbnail generated!"
                : "Video processed (trimmed and muted), but overlay burn-in failed. Saved and thumbnail generated."
            );
            // Optionally, set state to show thumbnailUri
          } catch (err) {
            console.error("Video processing error:", err);
            let message = "Failed to process video";
            if (err instanceof Error) {
              message = err.message;
            } else if (typeof err === "string") {
              message = err;
            }
            Alert.alert("Error", message);
          } finally {
            setIsRecording(false);
          }
        },
        onRecordingError: (error) => {
          // Clear auto-stop timer
          if (autoStopTimerRef.current) {
            clearTimeout(autoStopTimerRef.current);
            autoStopTimerRef.current = null;
          }
          console.error("Recording error:", {
            message: error.message,
            code: error.code,
          });
          Alert.alert("Error", `Recording failed: ${error.message}`);
          setIsRecording(false);
        },
        fileType: "mp4",
        flash: "off",
      });

      // Set auto-stop timer for 5 seconds
      autoStopTimerRef.current = setTimeout(() => {
        if (isRecording && cameraRef.current) {
          handleStopRecording();
        }
      }, 5000);

      console.log("Recording started successfully");
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording");
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;
    if (!recordingStartTime || Date.now() - recordingStartTime < 1000) {
      Alert.alert(
        "Wait",
        "Recording cannot be stopped until at least 1 second has passed."
      );
      return;
    }
    try {
      // Set recording state first to prevent multiple stop calls
      const wasRecording = isRecording;
      setIsRecording(false);
      if (wasRecording) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await cameraRef.current.stopRecording();
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      // Don't show alert as it might be called from cleanup
      setIsRecording(false);
    }
  };

  const recordButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordButtonScale.value }],
  }));
  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.cameraContainer}>
        {hasPermission && device && (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={isActive}
            video={true}
            audio={true}
            videoStabilizationMode="standard"
            onInitialized={() => {
              console.log("Camera initialized");
              setIsCameraReady(true);
            }}
            onError={(error) => {
              console.error("Camera error:", error);
              setIsCameraReady(false);
              setIsActive(false);
              setTimeout(() => setIsActive(true), 1000);
            }}
          />
        )}
        {/* OverlaySystem overlays UI, pass setOverlays to receive overlay state */}
        <OverlaySystem onClose={() => {}} onOverlaysChange={setOverlays} />
        <View style={styles.controlsContainer}>
          <RecordingControls
            isRecording={isRecording}
            onRecordPress={
              isRecording ? handleStopRecording : handleStartRecording
            }
            recordButtonAnimatedStyle={recordButtonAnimatedStyle}
            onRecordingComplete={handleStopRecording}
          />
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
    width: "100%",
    height: "100%",
  },
  controlsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  topControls: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
});
