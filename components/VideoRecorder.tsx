import React, { useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import RNFS from "react-native-fs";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import FFmpeg from "../utils/FFmpeg";

const VIDEO_DURATION = 5; // 5 seconds recording
const TRIM_DURATION = 2; // Keep 2 seconds after trimming

export default function VideoRecorder() {
  const camera = useRef<Camera>(null);
  const device = useCameraDevice("back");
  const [recording, setRecording] = useState(false);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null);

  // Overlay state
  const [showOverlay, setShowOverlay] = useState(false);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  // Setup gesture handlers
  const panGesture = Gesture.Pan().onUpdate((e) => {
    translateX.value += e.changeX;
    translateY.value += e.changeY;
  });

  const rotationGesture = Gesture.Rotation().onUpdate((e) => {
    rotation.value = e.rotation;
  });

  const scaleGesture = Gesture.Pinch().onUpdate((e) => {
    scale.value = e.scale;
  });

  const composed = Gesture.Simultaneous(
    panGesture,
    rotationGesture,
    scaleGesture
  );

  // Animated styles for overlay
  const overlayStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}rad` },
    ],
  }));

  const startRecording = async () => {
    try {
      setRecording(true);
      const video = await camera.current?.startRecording({
        onRecordingFinished: (video) => {
          processVideo(video.path);
        },
        onRecordingError: (error) => {
          console.error(error);
        },
      });

      // Stop recording after 5 seconds
      setTimeout(() => {
        camera.current?.stopRecording();
        setRecording(false);
      }, VIDEO_DURATION * 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      setRecording(false);
    }
  };

  const processVideo = async (inputPath: string) => {
    try {
      // Create output paths
      const trimmedPath = `${
        RNFS.CachesDirectoryPath
      }/trimmed_${Date.now()}.mp4`;
      const thumbnailPath = `${
        RNFS.CachesDirectoryPath
      }/thumb_${Date.now()}.jpg`;

      // Trim video and remove audio
      await FFmpeg.trimVideoAndMute(
        inputPath,
        trimmedPath,
        0, // Start from beginning
        TRIM_DURATION // Keep first 2 seconds
      );

      // Generate thumbnail
      await FFmpeg.generateThumbnail(trimmedPath, thumbnailPath);

      setVideoPath(trimmedPath);
      setThumbnailPath(thumbnailPath);
      setShowOverlay(true);
    } catch (error) {
      console.error("Failed to process video:", error);
    }
  };

  const addOverlayToVideo = async () => {
    if (!videoPath) return;

    try {
      const overlayPath = `${RNFS.MainBundleDirectory}/emoji.png`; // Your emoji/overlay image
      const outputPath = `${RNFS.CachesDirectoryPath}/final_${Date.now()}.mp4`;

      await FFmpeg.addOverlay(videoPath, overlayPath, outputPath, {
        x: Math.round(translateX.value),
        y: Math.round(translateY.value),
        scale: scale.value,
        rotation: rotation.value,
      });

      setVideoPath(outputPath);
      setShowOverlay(false);
    } catch (error) {
      console.error("Failed to add overlay:", error);
    }
  };

  if (!device) return <View style={styles.container} />;

  return (
    <GestureHandlerRootView style={styles.container}>
      <Camera
        ref={camera}
        device={device}
        isActive={true}
        video={true}
        audio={true}
        style={styles.camera}
      />

      {!recording && !videoPath && (
        <TouchableOpacity
          style={styles.recordButton}
          onPress={startRecording}
          disabled={recording}
        >
          <Text style={styles.recordText}>Record Clip</Text>
        </TouchableOpacity>
      )}

      {showOverlay && (
        <GestureDetector gesture={composed}>
          <Animated.View style={[styles.overlay, overlayStyle]}>
            <Text style={styles.emoji}>😎</Text>
          </Animated.View>
        </GestureDetector>
      )}

      {showOverlay && (
        <TouchableOpacity style={styles.saveButton} onPress={addOverlayToVideo}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      )}

      {thumbnailPath && (
        <Image source={{ uri: thumbnailPath }} style={styles.thumbnail} />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  recordButton: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    backgroundColor: "#ff3b30",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
  },
  recordText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  overlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -25 }, { translateY: -25 }],
  },
  emoji: {
    fontSize: 50,
  },
  saveButton: {
    position: "absolute",
    bottom: 50,
    right: 30,
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  saveText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  thumbnail: {
    position: "absolute",
    bottom: 50,
    left: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "white",
  },
});
