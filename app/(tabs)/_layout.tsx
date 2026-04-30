import React, { useEffect, useRef, useState } from 'react';
import { Tabs } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../../lib/constants';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApertureMark } from '../../components/ui/ApertureMark';
import { QuickActionSheet } from '../../components/ui/QuickActionSheet';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const { width: SW } = Dimensions.get('window');

// Shared callback refs for camera/gallery (set by the food-log page)
let _onCameraCallback: ((base64: string) => void) | null = null;
let _onGalleryCallback: ((base64: string) => void) | null = null;

export function setQuickActionCallbacks(
  onCamera: (base64: string) => void,
  onGallery: (base64: string) => void,
) {
  _onCameraCallback = onCamera;
  _onGalleryCallback = onGallery;
}

// Animated tab icon with scale + dot indicator
function TabIcon({
  iconName,
  iconNameFocused,
  focused,
}: {
  iconName: IoniconName;
  iconNameFocused: IoniconName;
  focused: boolean;
}) {
  const scale = useRef(new Animated.Value(focused ? 1.12 : 1)).current;
  const dotScale = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const dotOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const colorAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.18 : 1,
        useNativeDriver: true,
        damping: 14,
        stiffness: 320,
      }),
      Animated.spring(dotScale, {
        toValue: focused ? 1 : 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 280,
      }),
      Animated.timing(dotOpacity, {
        toValue: focused ? 1 : 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(colorAnim, {
        toValue: focused ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [focused]);

  const color = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.textMuted, Colors.primary],
  });

  return (
    <View style={styles.tabItem}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={focused ? iconNameFocused : iconName}
          size={24}
          color={focused ? Colors.primary : Colors.textMuted}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.tabDot,
          {
            transform: [{ scale: dotScale }],
            opacity: dotOpacity,
          },
        ]}
      />
    </View>
  );
}

export default function TabLayout() {
  const [showQuickAction, setShowQuickAction] = useState(false);
  const fabRotation = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabProgress = useRef(new Animated.Value(0)).current;
  const fabGlow = useRef(new Animated.Value(0)).current;

  function toggleFab() {
    const toValue = showQuickAction ? 0 : 1;
    Animated.parallel([
      Animated.spring(fabRotation, {
        toValue,
        useNativeDriver: true,
        damping: 14,
        stiffness: 200,
      }),
      Animated.spring(fabProgress, {
        toValue,
        useNativeDriver: false,
        damping: 14,
        stiffness: 200,
      }),
      Animated.spring(fabGlow, {
        toValue,
        useNativeDriver: false,
        damping: 12,
        stiffness: 180,
      }),
      Animated.sequence([
        Animated.timing(fabScale, {
          toValue: 0.82,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(fabScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 11,
          stiffness: 260,
        }),
      ]),
    ]).start();
    setShowQuickAction(!showQuickAction);
  }

  function closeFab() {
    Animated.parallel([
      Animated.spring(fabRotation, {
        toValue: 0,
        useNativeDriver: true,
        damping: 14,
        stiffness: 200,
      }),
      Animated.spring(fabProgress, {
        toValue: 0,
        useNativeDriver: false,
        damping: 14,
        stiffness: 200,
      }),
      Animated.spring(fabGlow, {
        toValue: 0,
        useNativeDriver: false,
        damping: 12,
        stiffness: 180,
      }),
    ]).start();
    setShowQuickAction(false);
  }

  async function handleOpenCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kamera kullanmak için izin vermeniz gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0].base64) return;
    if (_onCameraCallback) {
      _onCameraCallback(result.assets[0].base64);
    }
  }

  async function handleOpenGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galeriye erişmek için izin vermeniz gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0].base64) return;
    if (_onGalleryCallback) {
      _onGalleryCallback(result.assets[0].base64);
    }
  }

  const rotate = fabRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '135deg'],
  });

  const glowRadius = fabGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 22],
  });

  const glowOpacity = fabGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.42],
  });

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.borderLight,
            borderTopWidth: 0.5,
            height: Platform.OS === 'ios' ? 74 : 64,
            paddingBottom: Platform.OS === 'ios' ? 18 : 8,
            paddingTop: 8,
            shadowColor: Colors.ink,
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.07,
            shadowRadius: 16,
            elevation: 16,
          },
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                iconName="home-outline"
                iconNameFocused="home"
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="food-log"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                iconName="restaurant-outline"
                iconNameFocused="restaurant"
                focused={focused}
              />
            ),
          }}
        />

        {/* Center FAB slot */}
        <Tabs.Screen
          name="ai-chat"
          options={{
            tabBarIcon: () => null,
            tabBarButton: () => (
              <View style={styles.fabContainer}>
                <TouchableOpacity
                  onPress={toggleFab}
                  activeOpacity={0.88}
                  style={styles.fabTouchable}
                >
                  <Animated.View
                    style={[
                      styles.fabGlow,
                      {
                        shadowRadius: glowRadius,
                        shadowOpacity: glowOpacity,
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.fabOuter,
                      {
                        transform: [{ scale: fabScale }, { rotate }],
                      },
                    ]}
                  >
                    <ApertureMark animValue={fabProgress} size={62} />
                  </Animated.View>
                </TouchableOpacity>
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="progress"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                iconName="trending-up-outline"
                iconNameFocused="trending-up"
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="exercise"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                iconName="barbell-outline"
                iconNameFocused="barbell"
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                iconName="person-outline"
                iconNameFocused="person"
                focused={focused}
              />
            ),
          }}
        />
      </Tabs>

      <QuickActionSheet
        visible={showQuickAction}
        onClose={closeFab}
        onOpenCamera={handleOpenCamera}
        onOpenGallery={handleOpenGallery}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 2,
  },
  tabDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.primary,
  },
  fabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    top: -18,
  },
  fabTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabGlow: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'transparent',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
  },
  fabOuter: {
    width: 62,
    height: 62,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.26,
    shadowRadius: 12,
    elevation: 14,
  },
});
