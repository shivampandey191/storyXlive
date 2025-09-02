import { Circle, Square } from "lucide-react-native";
import React from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface RecordingControlsProps {
  isRecording: boolean;
  onRecordPress: () => void;
  recordButtonAnimatedStyle: any;
  onRecordingComplete?: () => void;
}

export default function RecordingControls({
  isRecording,
  onRecordPress,
  recordButtonAnimatedStyle,
  onRecordingComplete,
}: RecordingControlsProps) {
  const recordingPulse = useSharedValue(1);
  const timerOpacity = useSharedValue(0);
  const instructionsOpacity = useSharedValue(1);
  const sideButtonsScale = useSharedValue(1);
  const recordingRingScale = useSharedValue(0);
  const timerCount = useSharedValue(5);

  useAnimatedReaction(
    () => isRecording,
    (recording) => {
      if (recording) {
        recordingPulse.value = withRepeat(
          withSequence(
            withTiming(1.2, { duration: 600 }),
            withTiming(1, { duration: 600 })
          ),
          -1,
          false
        );

        recordingRingScale.value = withSequence(
          withTiming(0, { duration: 0 }),
          withSpring(1, { damping: 15, stiffness: 300 })
        );

        timerOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
        instructionsOpacity.value = withTiming(0, { duration: 200 });
        sideButtonsScale.value = withSpring(0.8, {
          damping: 15,
          stiffness: 300,
        });

        timerCount.value = 5;
        const countdownDuration = 1000; 
        for (let i = 4; i >= 0; i--) {
          timerCount.value = withDelay(
            (5 - i - 1) * countdownDuration,
            withTiming(i, {
              duration: countdownDuration,
              easing: (x) => x, 
            })
          );
        }
      } else {
        recordingPulse.value = withSpring(1, { damping: 15, stiffness: 300 });
        recordingRingScale.value = withTiming(0, { duration: 200 });
        timerOpacity.value = withTiming(0, { duration: 200 });
        instructionsOpacity.value = withDelay(
          100,
          withTiming(1, { duration: 300 })
        );
        sideButtonsScale.value = withSpring(1, { damping: 15, stiffness: 300 });
        timerCount.value = 5;
      }
    }
  );

  useAnimatedReaction(
    () => timerCount.value,
    (count) => {
      if (count <= 0 && onRecordingComplete && isRecording) {
        runOnJS(onRecordingComplete)();
      }
    }
  );

  const recordingPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordingPulse.value }],
    opacity: interpolate(recordingPulse.value, [1, 1.2], [0.8, 1]),
  }));

  const timerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: timerOpacity.value,
    transform: [
      {
        translateY: interpolate(timerOpacity.value, [0, 1], [20, 0]),
      },
    ],
  }));

  const instructionsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: instructionsOpacity.value,
    transform: [
      {
        translateY: interpolate(instructionsOpacity.value, [0, 1], [20, 0]),
      },
    ],
  }));

  const recordingRingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordingRingScale.value }],
    opacity: recordingRingScale.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.controlsRow}>
        <Animated.View
          style={[styles.recordButtonContainer, recordButtonAnimatedStyle]}
        >
          {isRecording && (
            <Animated.View
              style={[
                styles.recordingRing,
                recordingPulseStyle,
                recordingRingAnimatedStyle,
              ]}
            />
          )}
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
            ]}
            onPress={onRecordPress}
            activeOpacity={0.8}
          >
            {isRecording ? (
              <Square size={24} color="white" fill="white" />
            ) : (
              <Circle size={32} color="#FF3B30" fill="#FF3B30" />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Animated.View style={[styles.timerContainer, timerAnimatedStyle]}>
        <Text style={styles.timerLabel}>Recording...</Text>
      </Animated.View>

      <Animated.View
        style={[styles.instructionsContainer, instructionsAnimatedStyle]}
      >
        <Text style={styles.instructionsText}>
          Tap to record • Add overlays • Create your story
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 20,
  },
  sideButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  galleryPreview: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  settingsIcon: {
    flexDirection: "row",
    gap: 3,
  },
  settingsDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "white",
  },
  recordButtonContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  recordingRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#FF3B30",
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonActive: {
    backgroundColor: "#FF3B30",
    borderColor: "#FF3B30",
  },
  timerContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  timerText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  timerLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginTop: 4,
  },
  instructionsContainer: {
    alignItems: "center",
  },
  instructionsText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
