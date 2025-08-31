import * as Haptics from "expo-haptics";
import { Plus, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

interface OverlaySystemProps {
  onClose: () => void;
}

interface OverlayItem {
  id: string;
  type: "emoji" | "text";
  content: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

const EMOJIS = ["😎", "🔥", "❤️", "🎉", "✨", "🚀", "💯", "🌟"];
const SAMPLE_TEXTS = ["Hello!", "Amazing!", "Wow!", "Cool!", "Epic!"];

export default function OverlaySystem({ onClose }: OverlaySystemProps) {
  const [overlays, setOverlays] = useState<OverlayItem[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const menuScale = useSharedValue(0);
  const menuOpacity = useSharedValue(0);
  const addButtonRotation = useSharedValue(0);

  const toggleAddMenu = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const newShowState = !showAddMenu;
    setShowAddMenu(newShowState);

    if (newShowState) {
      // Enhanced menu entrance animation
      addButtonRotation.value = withSpring(45, { damping: 15, stiffness: 300 });
      menuScale.value = withSequence(
        withTiming(0.8, { duration: 100 }),
        withSpring(1, { damping: 12, stiffness: 400 })
      );
      menuOpacity.value = withTiming(1, { duration: 200 });
    } else {
      addButtonRotation.value = withSpring(0, { damping: 15, stiffness: 300 });
      menuScale.value = withTiming(0, { duration: 150 });
      menuOpacity.value = withTiming(0, { duration: 150 });
    }
  };

  const addOverlay = (type: "emoji" | "text", content: string) => {
    const newOverlay: OverlayItem = {
      id: Date.now().toString(),
      type,
      content,
      x: width / 2 - 50,
      y: height / 2 - 50,
      scale: 1,
      rotation: 0,
    };

    setOverlays((prev) => [...prev, newOverlay]);
    toggleAddMenu();
  };

  const removeOverlay = (id: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setOverlays((prev) => prev.filter((overlay) => overlay.id !== id));
  };

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: menuScale.value }],
    opacity: menuOpacity.value,
  }));

  const addButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${addButtonRotation.value}deg` }],
  }));

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Overlay Items */}
      {overlays.map((overlay) => (
        <OverlayItem
          key={overlay.id}
          overlay={overlay}
          onRemove={() => removeOverlay(overlay.id)}
          onUpdate={(updatedOverlay) => {
            setOverlays((prev) =>
              prev.map((item) =>
                item.id === overlay.id ? { ...item, ...updatedOverlay } : item
              )
            );
          }}
        />
      ))}

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={toggleAddMenu}
        activeOpacity={0.8}
      >
        <Animated.View style={addButtonAnimatedStyle}>
          <Plus size={24} color="white" />
        </Animated.View>
      </TouchableOpacity>

      {/* Add Menu */}
      {showAddMenu && (
        <Animated.View style={[styles.addMenu, menuAnimatedStyle]}>
          <View style={styles.menuSection}>
            <Text style={styles.menuTitle}>Add Emoji</Text>
            <View style={styles.emojiGrid}>
              {EMOJIS.map((emoji, index) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiButton}
                  onPress={() => addOverlay("emoji", emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.menuSection}>
            <Text style={styles.menuTitle}>Add Text</Text>
            <View style={styles.textGrid}>
              {SAMPLE_TEXTS.map((text, index) => (
                <TouchableOpacity
                  key={text}
                  style={styles.textButton}
                  onPress={() => addOverlay("text", text)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.textButtonText}>{text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={toggleAddMenu}
            activeOpacity={0.7}
          >
            <X size={20} color="white" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </GestureHandlerRootView>
  );
}

interface OverlayItemProps {
  overlay: OverlayItem;
  onRemove: () => void;
  onUpdate: (update: Partial<OverlayItem>) => void;
}

function OverlayItem({ overlay, onRemove, onUpdate }: OverlayItemProps) {
  const translateX = useSharedValue(overlay.x);
  const translateY = useSharedValue(overlay.y);
  const scale = useSharedValue(overlay.scale);
  const rotation = useSharedValue(overlay.rotation);
  const [showRemoveButton, setShowRemoveButton] = useState(false);

  // Enhanced animations for interactions
  const itemScale = useSharedValue(1);
  const itemOpacity = useSharedValue(1);

  // Gesture Handler 2.28.0 new API
  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(setShowRemoveButton)(true);
      if (Platform.OS !== "web") {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
      itemScale.value = withSpring(1.1, { damping: 15, stiffness: 300 });
    })
    .onUpdate((event) => {
      translateX.value = event.translationX + overlay.x;
      translateY.value = event.translationY + overlay.y;
    })
    .onEnd(() => {
      runOnJS(onUpdate)({
        x: translateX.value,
        y: translateY.value,
      });
      runOnJS(setShowRemoveButton)(false);
      itemScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      if (Platform.OS !== "web") {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onUpdate((event) => {
      scale.value = Math.max(0.5, Math.min(3, event.scale * overlay.scale));
    })
    .onEnd(() => {
      runOnJS(onUpdate)({
        scale: scale.value,
      });
    });

  const rotationGesture = Gesture.Rotation()
    .onStart(() => {
      if (Platform.OS !== "web") {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onUpdate((event) => {
      rotation.value = event.rotation + overlay.rotation;
    })
    .onEnd(() => {
      runOnJS(onUpdate)({
        rotation: rotation.value,
      });
    });

  // Compose gestures with new API
  const composedGesture = Gesture.Simultaneous(
    panGesture,
    Gesture.Simultaneous(pinchGesture, rotationGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value * itemScale.value },
      { rotate: `${rotation.value}rad` },
    ],
    opacity: itemOpacity.value,
  }));

  // Entrance animation
  React.useEffect(() => {
    itemOpacity.value = 0;
    itemScale.value = 0;

    itemOpacity.value = withTiming(1, { duration: 300 });
    itemScale.value = withSequence(
      withDelay(100, withSpring(1.2, { damping: 12, stiffness: 400 })),
      withSpring(1, { damping: 15, stiffness: 300 })
    );
  }, []);

  return (
    <View style={styles.overlayContainer}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.overlayItem, animatedStyle]}>
          {overlay.type === "emoji" ? (
            <Text style={styles.overlayEmoji}>{overlay.content}</Text>
          ) : (
            <Text style={styles.overlayText}>{overlay.content}</Text>
          )}
        </Animated.View>
      </GestureDetector>

      {showRemoveButton && (
        <TouchableOpacity
          style={[
            styles.removeButton,
            { left: translateX.value + 40, top: translateY.value - 10 },
          ]}
          onPress={onRemove}
          activeOpacity={0.7}
        >
          <X size={16} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  overlayContainer: {
    position: "absolute",
  },
  overlayItem: {
    padding: 10,
  },
  overlayEmoji: {
    fontSize: 40,
    textAlign: "center",
  },
  overlayText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: "center",
  },
  addButton: {
    position: "absolute",
    top: 200,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,107,107,0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addMenu: {
    position: "absolute",
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderRadius: 20,
    padding: 20,
    maxHeight: height * 0.6,
  },
  menuSection: {
    marginBottom: 20,
  },
  menuTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  emojiButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  emojiText: {
    fontSize: 24,
  },
  textGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  textButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: "rgba(255,107,107,0.8)",
  },
  textButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});
