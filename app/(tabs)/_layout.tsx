import React, { useState, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../../lib/constants';
import { View, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApertureMark } from '../../components/ui/ApertureMark';
import { QuickActionSheet } from '../../components/ui/QuickActionSheet';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  iconName,
  iconNameFocused,
  focused,
}: {
  iconName: IoniconName;
  iconNameFocused: IoniconName;
  focused: boolean;
}) {
  return (
    <View style={styles.tabItem}>
      <Ionicons
        name={focused ? iconNameFocused : iconName}
        size={26}
        color={focused ? Colors.primary : Colors.textMuted}
      />
    </View>
  );
}

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

export default function TabLayout() {
  const [showQuickAction, setShowQuickAction] = useState(false);
  const fabRotation = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  // Separate value for SVG-internal animations (cannot use native driver)
  const fabProgress = useRef(new Animated.Value(0)).current;

  function toggleFab() {
    const toValue = showQuickAction ? 0 : 1;
    Animated.parallel([
      Animated.spring(fabRotation, { toValue, useNativeDriver: true, damping: 15, stiffness: 200 }),
      Animated.spring(fabProgress, { toValue, useNativeDriver: false, damping: 15, stiffness: 200 }),
      Animated.sequence([
        Animated.timing(fabScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
        Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 250 }),
      ]),
    ]).start();
    setShowQuickAction(!showQuickAction);
  }

  function closeFab() {
    Animated.parallel([
      Animated.spring(fabRotation, { toValue: 0, useNativeDriver: true, damping: 15, stiffness: 200 }),
      Animated.spring(fabProgress, { toValue: 0, useNativeDriver: false, damping: 15, stiffness: 200 }),
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

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.borderLight,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon iconName="home-outline" iconNameFocused="home" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="food-log"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon iconName="restaurant-outline" iconNameFocused="restaurant" focused={focused} />
            ),
          }}
        />

        {/* Placeholder tab for FAB (hidden but needed for spacing) */}
        <Tabs.Screen
          name="ai-chat"
          options={{
            tabBarIcon: () => null,
            tabBarButton: () => (
              <View style={styles.fabContainer}>
                <TouchableOpacity onPress={toggleFab} activeOpacity={0.85}>
                  <Animated.View style={[styles.fabOuter, { transform: [{ scale: fabScale }, { rotate }] }]}>
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
              <TabIcon iconName="trending-up-outline" iconNameFocused="trending-up" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="exercise"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon iconName="barbell-outline" iconNameFocused="barbell" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon iconName="person-outline" iconNameFocused="person" focused={focused} />
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
    flex: 1,
  },
  fabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    top: -14,
  },
  fabOuter: {
    width: 62,
    height: 62,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 12,
  },
});
