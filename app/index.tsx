import FFmpegModule from "@/specs/NativeFFmpegModule";
import FFmpeg from "@/utils/FFmpeg";
import { saveVideoToGallery } from "@/utils/videoProcessing";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
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
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice("back");
  const { hasPermission } = useCameraPermission();

  const recordButtonScale = useSharedValue(1);

  const [video, setVideo] = useState<MediaLibrary.Asset | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access media library is required!");
      }
    })();
  }, []);

  const pickVideo = async () => {
    // Get all videos from media library
    const media = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.video,
      first: 1, // limit to 1 for demo
      sortBy: [[MediaLibrary.SortBy.creationTime, false]], // latest video
    });

    if (media.assets.length > 0) {
      setVideo(media.assets[0]);
      console.log("video data---", media.assets[0]); // pick the first video
      console.log(
        "video data---",
        FFmpegModule.getVideoMetaData(media.assets[0].uri)
      ); // pick the first video
    }
  };

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      console.log("App state changed to:", nextAppState);
      if (nextAppState === "active") {
        // App came to foreground
        console.log("App is active, enabling camera...");
        setIsActive(true);
        setIsCameraReady(true);
      } else {
        // App went to background
        console.log("App is in background, disabling camera...");
        setIsActive(false);
        if (isRecording) {
          // Stop recording if the app goes to background
          handleStopRecording();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isRecording]);

  const handleStartRecording = async () => {
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
      // Check camera state before recording
      if (!device) {
        console.error("No camera device selected");
        return;
      }

      console.log("Camera state check passed, starting recording...");
      setIsRecording(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await cameraRef.current.startRecording({
        onRecordingFinished: async (video) => {
          console.log("Recording finished. Video details:", {
            path: video.path,
            duration: video.duration,
          });

          try {
            // Ask user what to do: mute, trim, or both
            Alert.alert("Process Video", "Choose an action for your video:", [
              {
                text: "Mute Only",
                onPress: () => {
                  (async () => {
                    try {
                      console.log("[Alert] Mute Only selected");
                      const outputPath = `${
                        FileSystem.cacheDirectory
                      }muted_${Date.now()}.mp4`;
                      await FFmpeg.trimVideoAndMute(
                        video.path,
                        outputPath,
                        0,
                        Math.floor(video.duration)
                      );
                      console.log(
                        "[Alert] Mute Only: Processing done, saving to gallery",
                        outputPath
                      );
                      await saveVideoToGallery(outputPath);
                      Alert.alert("Success", "Muted video saved to gallery");
                    } catch (err) {
                      console.error("[Alert] Mute Only error:", err);
                      Alert.alert("Error", "Failed to mute and save video");
                    } finally {
                      setIsRecording(false);
                    }
                  })();
                },
              },
              {
                text: "Trim Only",
                onPress: () => {
                  (async () => {
                    try {
                      console.log("[Alert] Trim Only selected");
                      const outputPath = `${
                        FileSystem.cacheDirectory
                      }trimmed_${Date.now()}.mp4`;
                      await FFmpeg.trimVideo(
                        video.path,
                        outputPath,
                        0,
                        Math.max(1, Math.floor(video.duration - 2))
                      );
                      console.log(
                        "[Alert] Trim Only: Processing done, saving to gallery",
                        outputPath
                      );
                      await saveVideoToGallery(outputPath);
                      Alert.alert("Success", "Trimmed video saved to gallery");
                    } catch (err) {
                      console.error("[Alert] Trim Only error:", err);
                      Alert.alert("Error", "Failed to trim and save video");
                    } finally {
                      setIsRecording(false);
                    }
                  })();
                },
              },
              {
                text: "Trim & Mute",
                onPress: () => {
                  (async () => {
                    try {
                      console.log("[Alert] Trim & Mute selected");
                      const outputPath = `${
                        FileSystem.cacheDirectory
                      }processed_${Date.now()}.mp4`;
                      await FFmpeg.trimVideoAndMute(
                        video.path,
                        outputPath,
                        0,
                        Math.max(1, Math.floor(video.duration - 2))
                      );
                      console.log(
                        "[Alert] Trim & Mute: Processing done, saving to gallery",
                        outputPath
                      );
                      await saveVideoToGallery(outputPath);
                      Alert.alert(
                        "Success",
                        "Trimmed & muted video saved to gallery"
                      );
                    } catch (err) {
                      console.error("[Alert] Trim & Mute error:", err);
                      Alert.alert(
                        "Error",
                        "Failed to trim/mute and save video"
                      );
                    } finally {
                      setIsRecording(false);
                    }
                  })();
                },
                style: "default",
              },
              { text: "Cancel", style: "cancel" },
            ]);
          } catch (error) {
            console.error("Failed to process/save video:", error);
            Alert.alert("Error", "Failed to process or save video");
          } finally {
            setIsRecording(false);
          }
        },
        onRecordingError: (error) => {
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

      console.log("Recording started successfully");
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording");
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

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
      <View style={{ padding: 30 }}>
        <Text style={{ fontSize: 30, color: "red" }}>
          {FFmpegModule.getFFmpegVersion()}
        </Text>
      </View>
      <TouchableOpacity
        onPress={pickVideo}
        style={{ backgroundColor: "blue", padding: 10 }}
        y
      >
        <Text>Pick Video</Text>
      </TouchableOpacity>
      {/* <View style={styles.cameraContainer}>
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
              // Try to recover by toggling active state
              setIsActive(false);
              setTimeout(() => setIsActive(true), 1000);
            }}
          />
        )}
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
      </View> */}
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
