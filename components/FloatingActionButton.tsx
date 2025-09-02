import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface FloatingActionButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
  pulseAnimation?: boolean;
}

export default function FloatingActionButton({
  children,
  onPress,
  style,
  pulseAnimation = false,
}: FloatingActionButtonProps) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const shadowOpacity = useSharedValue(0.3);

  React.useEffect(() => {
    if (pulseAnimation) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        false
      );
    }
  }, [pulseAnimation]);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
      rotation.value = withSpring(15, { damping: 15, stiffness: 300 });
      shadowOpacity.value = withTiming(0.6, { duration: 100 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      rotation.value = withSpring(0, { damping: 15, stiffness: 300 });
      shadowOpacity.value = withTiming(0.3, { duration: 200 });
      
      runOnJS(onPress)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` }
    ],
    shadowOpacity: shadowOpacity.value,
  }));

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={[styles.container, style, animatedStyle]}>
        <TouchableOpacity style={styles.button} activeOpacity={1}>
          {children}
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  button: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});