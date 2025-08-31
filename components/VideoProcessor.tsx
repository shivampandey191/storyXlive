import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Video, Scissors, VolumeX, Save } from 'lucide-react-native';

interface VideoProcessorProps {
  isProcessing: boolean;
  progress: number;
}

export default function VideoProcessor({ isProcessing, progress }: VideoProcessorProps) {
  const processingRotation = useSharedValue(0);
  const progressScale = useSharedValue(0);
  const stepOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (isProcessing) {
      // Processing animation
      processingRotation.value = withRepeat(
        withTiming(360, { duration: 2000 }),
        -1,
        false
      );
      
      // Progress animation
      progressScale.value = withTiming(progress, { duration: 500 });
      
      // Step indicator animation
      stepOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.5, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      processingRotation.value = 0;
      progressScale.value = 0;
      stepOpacity.value = 0;
    }
  }, [isProcessing, progress]);

  const processingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${processingRotation.value}deg` }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progressScale.value }],
  }));

  const stepAnimatedStyle = useAnimatedStyle(() => ({
    opacity: stepOpacity.value,
  }));

  if (!isProcessing) return null;

  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <View style={styles.processingCard}>
        <Animated.View style={[styles.iconContainer, processingAnimatedStyle]}>
          <Video size={32} color="#FF6B6B" />
        </Animated.View>
        
        <Text style={styles.title}>Processing Video</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
        </View>

        <View style={styles.stepsContainer}>
          <Animated.View style={[styles.step, stepAnimatedStyle]}>
            <Scissors size={16} color="white" />
            <Text style={styles.stepText}>Trimming to 3 seconds</Text>
          </Animated.View>
          
          <Animated.View style={[styles.step, stepAnimatedStyle]}>
            <VolumeX size={16} color="white" />
            <Text style={styles.stepText}>Removing audio</Text>
          </Animated.View>
          
          <Animated.View style={[styles.step, stepAnimatedStyle]}>
            <Save size={16} color="white" />
            <Text style={styles.stepText}>Saving locally</Text>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginHorizontal: 40,
    backdropFilter: 'blur(10px)',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,107,107,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
  progressText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  stepsContainer: {
    width: '100%',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 10,
  },
});