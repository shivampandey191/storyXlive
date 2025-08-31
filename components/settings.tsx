import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  withDelay,
  withSequence,
  runOnJS,
  FadeInDown,
  FadeInUp,
  BounceIn,
} from 'react-native-reanimated';
import {
  Camera,
  Video,
  Volume2,
  VolumeX,
  Smartphone,
  Info,
  Star,
  Share,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

export default function SettingsScreen() {
  const [settings, setSettings] = useState({
    autoSave: true,
    soundEffects: true,
    hapticFeedback: true,
    highQuality: false,
    autoTrim: true,
  });

  const headerScale = useSharedValue(0.8);
  const headerOpacity = useSharedValue(0);
  const iconRotation = useSharedValue(0);

  React.useEffect(() => {
    // Enhanced entrance animations with Reanimated 4.0.3
    headerOpacity.value = withTiming(1, { duration: 600 });
    headerScale.value = withSpring(1, { 
      damping: 15, 
      stiffness: 300,
      mass: 0.8 
    });
    
    // Rotating settings icon
    iconRotation.value = withSequence(
      withDelay(300, withSpring(360, { damping: 15, stiffness: 300 })),
      withSpring(0, { damping: 15, stiffness: 300 })
    );
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [
      { scale: headerScale.value },
      { 
        translateY: interpolate(
          headerOpacity.value, 
          [0, 1], 
          [30, 0]
        ) 
      }
    ],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }],
  }));

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const showInfo = (title: string, message: string) => {
    Alert.alert(title, message);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Animated.View style={headerAnimatedStyle}>
          <Animated.View style={iconAnimatedStyle}>
            <SettingsIcon size={32} color="white" />
          </Animated.View>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>
            Customize your StoryX Live experience
          </Text>
        </Animated.View>
      </LinearGradient>

      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Recording Settings */}
          <Animated.View entering={FadeInDown.delay(200).springify().damping(15).stiffness(300)}>
            <SettingsSection title="Recording" icon={<Camera size={20} color="#FF6B6B" />}>
              <SettingItem
                title="Auto-save recordings"
                description="Automatically save videos to gallery"
                value={settings.autoSave}
                onToggle={() => toggleSetting('autoSave')}
              />
              <SettingItem
                title="High quality recording"
                description="Record in 1080p (uses more storage)"
                value={settings.highQuality}
                onToggle={() => toggleSetting('highQuality')}
              />
              <SettingItem
                title="Auto-trim videos"
                description="Automatically trim to 5 seconds"
                value={settings.autoTrim}
                onToggle={() => toggleSetting('autoTrim')}
              />
            </SettingsSection>
          </Animated.View>

          {/* Audio Settings */}
          <Animated.View entering={FadeInDown.delay(400).springify().damping(15).stiffness(300)}>
            <SettingsSection title="Audio" icon={<Volume2 size={20} color="#FF6B6B" />}>
              <SettingItem
                title="Sound effects"
                description="Play sounds for interactions"
                value={settings.soundEffects}
                onToggle={() => toggleSetting('soundEffects')}
              />
            </SettingsSection>
          </Animated.View>

          {/* Interface Settings */}
          <Animated.View entering={FadeInDown.delay(600).springify().damping(15).stiffness(300)}>
            <SettingsSection title="Interface" icon={<Smartphone size={20} color="#FF6B6B" />}>
              <SettingItem
                title="Haptic feedback"
                description="Vibrate on button presses"
                value={settings.hapticFeedback}
                onToggle={() => toggleSetting('hapticFeedback')}
              />
            </SettingsSection>
          </Animated.View>

          {/* App Info */}
          <Animated.View entering={FadeInDown.delay(800).springify().damping(15).stiffness(300)}>
            <SettingsSection title="About" icon={<Info size={20} color="#FF6B6B" />}>
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => showInfo('Version', 'StoryX Live v1.0.0\nBuilt with React Native & Expo')}
                activeOpacity={0.7}
              >
                <Text style={styles.infoButtonText}>App Version</Text>
                <Text style={styles.infoButtonValue}>1.0.0</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => showInfo('Rate App', 'Enjoying StoryX Live? Please rate us on the App Store!')}
                activeOpacity={0.7}
              >
                <Star size={16} color="#FFD700" />
                <Text style={styles.infoButtonText}>Rate App</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => showInfo('Share', 'Share StoryX Live with your friends!')}
                activeOpacity={0.7}
              >
                <Share size={16} color="#4A90E2" />
                <Text style={styles.infoButtonText}>Share App</Text>
              </TouchableOpacity>
            </SettingsSection>
          </Animated.View>

          {/* Footer */}
          <Animated.View 
            entering={FadeInUp.delay(1000).duration(600)}
            style={styles.footer}
          >
            <Text style={styles.footerText}>
              Made with ❤️ for creative storytellers
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

interface SettingsSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function SettingsSection({ title, icon, children }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
}

interface SettingItemProps {
  title: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}

function SettingItem({ title, description, value, onToggle }: SettingItemProps) {
  const scale = useSharedValue(1);
  const switchScale = useSharedValue(1);

  const handlePress = () => {
    // Enhanced interaction animations
    scale.value = withSequence(
      withSpring(0.98, { damping: 20, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 300 })
    );
    
    switchScale.value = withSequence(
      withSpring(1.1, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 300 })
    );
    
    onToggle();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const switchAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: switchScale.value }],
  }));

  return (
    <Animated.View style={[styles.settingItem, animatedStyle]}>
      <TouchableOpacity
        style={styles.settingContent}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
        <Animated.View style={switchAnimatedStyle}>
          <Switch
            value={value}
            onValueChange={onToggle}
            trackColor={{ false: '#333', true: '#FF6B6B' }}
            thumbColor={value ? '#fff' : '#666'}
          />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    marginTop: -25,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  sectionContent: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    overflow: 'hidden',
  },
  settingItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  settingText: {
    flex: 1,
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  infoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 10,
    flex: 1,
  },
  infoButtonValue: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
});