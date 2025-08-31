import RecordingControls from "@/components/RecordingControls";
import { saveVideoToGallery } from "@/utils/videoProcessing";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import { StatusBar } from "expo-status-bar";
import { Sparkles } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Camera, CameraDevice } from "react-native-vision-camera";
import OverlaySystem from "./OverlaySystem";

const { width, height } = Dimensions.get("window");

export default function HomeScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [showOverlays, setShowOverlays] = useState(false);
  const [device, setDevice] = useState<CameraDevice | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef<Camera>(null);

  // Reanimated animations
  const recordButtonScale = useSharedValue(1);
  const sparkleRotation = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);
  const topControlsOpacity = useSharedValue(1);
  const liveDotScale = useSharedValue(1);

  console.log("device---", device);

  useEffect(() => {
    async function initializeCamera() {
      try {
        console.log("Requesting permissions...");
        const [cameraPermission, microphonePermission, mediaLibraryPermission] =
          await Promise.all([
            Camera.requestCameraPermission(),
            Camera.requestMicrophonePermission(),
            MediaLibrary.requestPermissionsAsync(),
          ]);

        console.log("Permissions result:", {
          camera: cameraPermission,
          microphone: microphonePermission,
          mediaLibrary: mediaLibraryPermission.granted,
        });

        if (cameraPermission !== "granted") {
          Alert.alert("Error", "Camera permission is required");
          return;
        }

        if (microphonePermission !== "granted") {
          Alert.alert(
            "Warning",
            "Microphone permission denied. Recording without audio."
          );
        }

        if (!mediaLibraryPermission.granted) {
          Alert.alert(
            "Error",
            "Media library permission is required to save videos"
          );
          return;
        }

        console.log("Getting available devices...");
        const devices = await Camera.getAvailableCameraDevices();
        console.log("Available devices:", JSON.stringify(devices, null, 2));

        const backCameras = devices.filter((d) => d.position === "back");
        console.log("Back cameras:", JSON.stringify(backCameras, null, 2));

        if (backCameras.length === 0) {
          Alert.alert("Error", "No back camera found");
          return;
        }

        const selectedDevice = backCameras[0];
        console.log(
          "Selected device:",
          JSON.stringify(selectedDevice, null, 2)
        );

        // Ensure the camera is available before setting the device
        const isCameraAvailable = await Camera.getCameraPermissionStatus();
        console.log("Camera availability:", isCameraAvailable);

        if (isCameraAvailable === "granted") {
          setDevice(selectedDevice);
        } else {
          Alert.alert("Error", "Camera is not available");
        }
      } catch (error) {
        console.error("Camera initialization error:", error);
        Alert.alert("Error", "Failed to initialize camera");
      }
    }

    initializeCamera();
  }, []);

  useEffect(() => {
    // Continuous sparkle rotation
    sparkleRotation.value = withRepeat(
      withTiming(360, { duration: 3000 }),
      -1,
      false
    );

    // Enhanced pulse animation
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      false
    );

    // Live dot pulsing
    liveDotScale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );

    // Cleanup function
    return () => {
      if (isRecording) {
        handleStopRecording();
      }
    };
  }, []);

  const recordButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordButtonScale.value }],
  }));

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparkleRotation.value}deg` }],
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
    opacity: interpolate(pulseAnimation.value, [1, 1.1], [0.7, 1]),
  }));

  const topControlsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: topControlsOpacity.value,
  }));

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
            await saveVideoToGallery(video.path);
            console.log("Video successfully saved to gallery");
            Alert.alert("Success", "Video saved to gallery");
          } catch (error) {
            console.error("Failed to save video:", error);
            Alert.alert("Error", "Failed to save video to gallery");
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

  const toggleOverlays = () => {
    setShowOverlays(!showOverlays);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.cameraContainer}>
        {device && (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
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
            }}
          />
        )}
        <Animated.View style={[styles.topControls, topControlsAnimatedStyle]}>
          <TouchableOpacity style={styles.iconButton} onPress={toggleOverlays}>
            <Sparkles color="#fff" size={24} />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.controlsContainer}>
          <RecordingControls
            isRecording={isRecording}
            onRecordPress={
              isRecording ? handleStopRecording : handleStartRecording
            }
            recordButtonAnimatedStyle={recordButtonAnimatedStyle}
            onRecordingComplete={handleStopRecording}
          />

          {showOverlays && (
            <OverlaySystem onClose={() => setShowOverlays(false)} />
          )}
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
