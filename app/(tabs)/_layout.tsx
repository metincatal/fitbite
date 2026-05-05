import React, { useEffect, useRef, useState } from 'react';
import { Tabs, useSegments } from 'expo-router';
import { Colors } from '../../lib/constants';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  Alert,
  PanResponder,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { QuickActionSheet } from '../../components/ui/QuickActionSheet';
import * as ImagePicker from 'expo-image-picker';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const { width: SW } = Dimensions.get('window');

// Shared callback refs for camera/gallery (set by the food-log page)
let _onCameraCallback: ((base64: string) => void) | null = null;
let _onGalleryCallback: ((base64: string) => void) | null = null;

// Module-level ref for programmatic tab navigation (used by swipe gesture)
let _swipeNavigateToTab: ((tabName: string) => void) | null = null;
let _isQuickActionOpen = false;

export function setQuickActionCallbacks(
  onCamera: (base64: string) => void,
  onGallery: (base64: string) => void,
) {
  _onCameraCallback = onCamera;
  _onGalleryCallback = onGallery;
}

// ────────────────────────────────────────────────────────────────────────────
// Tab icon SVGs — mono-line, matches the design system
// ────────────────────────────────────────────────────────────────────────────
function TabSvgIcon({ kind, active }: { kind: string; active: boolean }) {
  const color = active ? Colors.background : Colors.textSecondary;
  const sw = active ? 1.6 : 1.3;
  const p = { fill: 'none' as const, stroke: color, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  if (kind === 'home') return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M4 11 L12 4 L20 11 V20 H14 V14 H10 V20 H4 Z" {...p} />
    </Svg>
  );
  if (kind === 'plate') return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={8} {...p} />
      <Circle cx={12} cy={12} r={3} {...p} />
    </Svg>
  );
  if (kind === 'spiral') return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M12 12 m-1 0 a1 1 0 1 0 2 0 a4 4 0 1 0 -7.5 -2 a8 8 0 1 0 14.5 4" {...p} />
    </Svg>
  );
  if (kind === 'pulse') return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M3 12 H7 L9 6 L13 18 L16 9 L18 12 H21" {...p} />
    </Svg>
  );
  if (kind === 'profile') return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Circle cx={12} cy={9} r={3.5} {...p} />
      <Path d="M5 20 Q5 14 12 14 Q19 14 19 20" {...p} />
    </Svg>
  );
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Tab definitions (no ai-chat)
// ────────────────────────────────────────────────────────────────────────────
const TAB_DEFS = [
  { name: 'index',    label: 'Bugün',    icon: 'home' },
  { name: 'food-log', label: 'Tabak',    icon: 'plate' },
  { name: 'progress', label: 'İlerleme', icon: 'spiral' },
  { name: 'exercise', label: 'Egzersiz', icon: 'pulse' },
  { name: 'profile',  label: 'Profil',   icon: 'profile' },
];

// ────────────────────────────────────────────────────────────────────────────
// Shared indicator animation — pixel space, driven by both tap and swipe drag.
// TAB_W = (SW - pillPaddingH×2 - barSide×2) / nTabs = (SW - 16 - 28) / 5
// ────────────────────────────────────────────────────────────────────────────
const TAB_W = (SW - 44) / TAB_DEFS.length;
const _indicatorPos = new Animated.Value(8); // tab 0 = paddingHorizontal offset

function springIndicatorTo(idx: number) {
  Animated.spring(_indicatorPos, {
    toValue: 8 + idx * TAB_W,
    useNativeDriver: false,
    damping: 22,
    stiffness: 260,
    mass: 0.8,
  }).start();
}

// ────────────────────────────────────────────────────────────────────────────
// Custom tab bar
// ────────────────────────────────────────────────────────────────────────────
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const [showQuickAction, setShowQuickAction] = useState(false);
  const discRotate = useRef(new Animated.Value(0)).current;
  const discScale = useRef(new Animated.Value(1)).current;

  // Map Expo Router route names to our TAB_DEFS
  const routeToTabIdx = (routeName: string): number => {
    const clean = routeName.replace(/^.*\//, '').replace(/\?.*$/, '');
    return TAB_DEFS.findIndex((t) => t.name === clean);
  };

  const activeRouteName = state.routes[state.index]?.name ?? '';
  const activeTabIdx = Math.max(0, routeToTabIdx(activeRouteName));

  // Expose navigate fn for swipe gesture (updated on every render so navigation/state are fresh)
  useEffect(() => {
    _isQuickActionOpen = showQuickAction;
  }, [showQuickAction]);

  useEffect(() => {
    _swipeNavigateToTab = (tabName: string) => {
      const route = state.routes.find((r) => {
        const clean = r.name.replace(/^.*\//, '').replace(/\?.*$/, '');
        return clean === tabName;
      });
      if (route) navigation.navigate(route.name, route.params);
    };
  });

  function toggleDisc() {
    const toValue = showQuickAction ? 0 : 1;
    Animated.parallel([
      Animated.spring(discRotate, { toValue, useNativeDriver: true, damping: 14, stiffness: 200 }),
      Animated.sequence([
        Animated.timing(discScale, { toValue: 0.85, duration: 70, useNativeDriver: true }),
        Animated.spring(discScale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 280 }),
      ]),
    ]).start();
    setShowQuickAction((v) => !v);
  }

  function closeDisc() {
    Animated.parallel([
      Animated.spring(discRotate, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 200 }),
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
    if (_onCameraCallback) _onCameraCallback(result.assets[0].base64);
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
    if (_onGalleryCallback) _onGalleryCallback(result.assets[0].base64);
  }

  const BAR_H = 58;
  const BAR_BOTTOM = Platform.OS === 'ios' ? 26 : 14;
  const BAR_SIDE = 14;
  const DISC_BOTTOM = BAR_BOTTOM + BAR_H + 10;

  const rotate = discRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '135deg'],
  });

  return (
    <>
      {/* Floating "+" disc */}
      <Animated.View
        style={[
          styles.discWrapper,
          { bottom: DISC_BOTTOM, transform: [{ scale: discScale }, { rotate }] },
        ]}
      >
        <TouchableOpacity
          onPress={toggleDisc}
          activeOpacity={0.88}
          style={styles.discBtn}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Line x1={12} y1={5} x2={12} y2={19} stroke={Colors.background} strokeWidth={2} strokeLinecap="round" />
            <Line x1={5} y1={12} x2={19} y2={12} stroke={Colors.background} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </Animated.View>

      {/* Floating pill tab bar */}
      <View
        style={[
          styles.pillBar,
          { bottom: BAR_BOTTOM, left: BAR_SIDE, right: BAR_SIDE, height: BAR_H },
        ]}
      >
        {/* Sliding indicator pill */}
        <Animated.View
          style={[
            styles.indicator,
            { left: _indicatorPos, width: TAB_W },
          ]}
        />

        {/* Tabs */}
        {TAB_DEFS.map((tab, i) => {
          const isActive = i === activeTabIdx;
          // Find the matching route in state.routes
          const route = state.routes.find((r) => {
            const clean = r.name.replace(/^.*\//, '').replace(/\?.*$/, '');
            return clean === tab.name;
          });

          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabBtn}
              activeOpacity={0.75}
              onPress={() => {
                if (route) {
                  springIndicatorTo(i);
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!event.defaultPrevented) {
                    navigation.navigate(route.name, route.params);
                  }
                }
              }}
            >
              <TabSvgIcon kind={tab.icon} active={isActive} />
              <Animated.Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? Colors.background : Colors.textSecondary, opacity: isActive ? 1 : 0.75 },
                ]}
              >
                {tab.label}
              </Animated.Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Action Sheet */}
      <QuickActionSheet
        visible={showQuickAction}
        onClose={closeDisc}
        onOpenCamera={handleOpenCamera}
        onOpenGallery={handleOpenGallery}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tab order (matches TAB_DEFS, ai-chat excluded)
// ────────────────────────────────────────────────────────────────────────────
const SWIPE_TAB_ROUTES = ['index', 'food-log', 'progress', 'exercise', 'profile'] as const;

// ────────────────────────────────────────────────────────────────────────────
// Layout
// ────────────────────────────────────────────────────────────────────────────
export default function TabLayout() {
  const segments = useSegments();

  // Always-fresh ref so the gesture (created once) reads the latest tab index
  const currentIdxRef = useRef(0);
  useEffect(() => {
    const last = (segments[segments.length - 1] ?? 'index') as string;
    const idx = SWIPE_TAB_ROUTES.indexOf(last as typeof SWIPE_TAB_ROUTES[number]);
    const safeIdx = idx >= 0 ? idx : 0;
    currentIdxRef.current = safeIdx;
    springIndicatorTo(safeIdx);
  }, [segments]);

  // PanResponder capture: fires top-down before native ScrollViews can claim the gesture.
  // Captures horizontal swipes (dx/dy ratio > 2x AND dx > 10px); lets vertical scrolls pass.
  // No real-time indicator tracking during drag — indicator and navigation fire together on release.
  const swipePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        !_isQuickActionOpen && Math.abs(gs.dx) > Math.abs(gs.dy) * 2.0 && Math.abs(gs.dx) > 10,
      onPanResponderGrant: () => {},
      onPanResponderRelease: (_, gs) => {
        const isHorizontal = Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5;
        const sufficient = Math.abs(gs.dx) > 55 || Math.abs(gs.vx) > 0.3;

        const idx = currentIdxRef.current;
        let targetIdx = idx;

        if (isHorizontal && sufficient) {
          if (gs.dx < 0 && idx < SWIPE_TAB_ROUTES.length - 1) targetIdx = idx + 1;
          else if (gs.dx > 0 && idx > 0) targetIdx = idx - 1;
        }

        // Indicator spring and navigation fire at the same instant — fully in sync
        springIndicatorTo(targetIdx);
        if (targetIdx !== idx) {
          _swipeNavigateToTab?.(SWIPE_TAB_ROUTES[targetIdx]);
        }
      },
      onPanResponderTerminate: () => {
        springIndicatorTo(currentIdxRef.current);
      },
    }),
  ).current;

  return (
    <View style={{ flex: 1 }} {...swipePan.panHandlers}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="food-log" />
        <Tabs.Screen name="ai-chat" options={{ href: null }} />
        <Tabs.Screen name="progress" />
        <Tabs.Screen name="exercise" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  pillBar: {
    position: 'absolute',
    zIndex: 40,
    backgroundColor: Colors.background,
    borderRadius: 999,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    shadowColor: '#17201A',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.10,
    shadowRadius: 36,
    elevation: 18,
  },
  indicator: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    borderRadius: 999,
    backgroundColor: Colors.ink,
    shadowColor: '#17201A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 3,
    zIndex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  tabLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  discWrapper: {
    position: 'absolute',
    right: 22,
    zIndex: 41,
    shadowColor: '#17201A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 14,
  },
  discBtn: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: Colors.ink ?? '#17201A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
