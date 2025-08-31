import RecordingControls from "@/components/RecordingControls";
import FFmpegModule from "@/specs/NativeFFmpegModule";
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
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import * as VideoThumbnails from "expo-video-thumbnails";

const { width, height } = Dimensions.get("window");

export default function HomeScreen() {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice("back");
  const { hasPermission } = useCameraPermission();

  const recordButtonScale = useSharedValue(1);

  // const [video, setVideo] = useState<MediaLibrary.Asset | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access media library is required!");
      }
    })();
  }, []);

  // const pickVideo = async () => {
  //   // Get all videos from media library
  //   const media = await MediaLibrary.getAssetsAsync({
  //     mediaType: MediaLibrary.MediaType.video,
  //     first: 1, // limit to 1 for demo
  //     sortBy: [[MediaLibrary.SortBy.creationTime, false]], // latest video
  //   });

  //   if (media.assets.length > 0) {
  //     setVideo(media.assets[0]);
  //     console.log("video data---", media.assets[0]); // pick the first video
  //     console.log(
  //       "video data---",
  //       FFmpegModule.getVideoMetaData(media.assets[0].uri)
  //     ); // pick the first video
  //   }
  // };

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
          try {
            // Step 1: Trim the first 3 seconds using trimVideo
            const trimmedPath = `${
              FileSystem.cacheDirectory
            }trimmed_${Date.now()}.mp4`;
            const start = 3;
            const duration = Math.max(1, Math.floor(video.duration - 3));
            const trimSuccess = FFmpegModule.trimVideo(
              video.path,
              trimmedPath,
              start,
              duration
            );
            if (!trimSuccess) throw new Error("Trimming failed");

            // Step 2: Mute the trimmed video
            const mutedPath = `${
              FileSystem.cacheDirectory
            }muted_${Date.now()}.mp4`;
            const muteSuccess = FFmpegModule.muteVideo(trimmedPath, mutedPath);
            if (!muteSuccess) throw new Error("Muting failed");

            // Step 3: Save to gallery
            await saveVideoToGallery(mutedPath);

            // Step 4: Generate thumbnail
            const { uri: thumbnailUri } =
              await VideoThumbnails.getThumbnailAsync(mutedPath, { time: 0 });

            Alert.alert(
              "Success",
              "Video processed, saved, and thumbnail generated!"
            );
            // Optionally, set state to show thumbnailUri
          } catch (err) {
            console.error("Video processing error:", err);
            Alert.alert("Error", "Failed to process video");
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
      {/* <View style={{ padding: 30 }}>
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
      </TouchableOpacity> */}
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
