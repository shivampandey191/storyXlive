import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface AnimatedButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  onPress?: () => void;
  scaleValue?: number;
  springConfig?: {
    damping?: number;
    stiffness?: number;
    mass?: number;
  };
}

export default function AnimatedButton({
  children,
  onPress,
  style,
  scaleValue = 0.95,
  springConfig = { damping: 15, stiffness: 300, mass: 0.8 },
  ...props
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Enhanced gesture handling with Gesture Handler 2.28.0
  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(scaleValue, springConfig);
      opacity.value = withTiming(0.8, { duration: 100 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, springConfig);
      opacity.value = withTiming(1, { duration: 150 });
      
      if (onPress) {
        runOnJS(onPress)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={[animatedStyle, style]}>
        <TouchableOpacity {...props} activeOpacity={1}>
          {children}
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
}