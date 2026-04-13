import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Colors, Spacing, FontSize } from '../../../lib/constants';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StoryScreenProps {
  children: React.ReactNode;
  variant?: 'light' | 'dark' | 'gradient';
}

export function StoryScreen({ children, variant = 'light' }: StoryScreenProps) {
  const bgColor = variant === 'dark' ? Colors.textPrimary : Colors.background;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {children}
    </View>
  );
}

interface StoryTextProps {
  children: string;
  size?: 'hero' | 'title' | 'body' | 'caption';
  color?: string;
  bold?: boolean;
  delay?: number;
  style?: any;
}

export function StoryText({
  children,
  size = 'title',
  color,
  bold = false,
  delay = 0,
  style,
}: StoryTextProps) {
  const fontSizeMap = {
    hero: FontSize.hero,
    title: FontSize.xxxl,
    body: FontSize.lg,
    caption: FontSize.md,
  };

  return (
    <Animated.Text
      entering={FadeInDown.delay(delay).duration(600)}
      style={[
        {
          fontSize: fontSizeMap[size],
          fontWeight: bold ? '800' : '400',
          color: color || Colors.textPrimary,
          lineHeight: fontSizeMap[size] * 1.3,
        },
        style,
      ]}
    >
      {children}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
