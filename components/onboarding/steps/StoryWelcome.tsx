import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize } from '../../../lib/constants';
import { OnboardingButton } from '../shared/OnboardingButton';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function StoryWelcome({ onNext }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.Text entering={FadeIn.delay(0).duration(800)} style={styles.year}>
          2026
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(300).duration(700)} style={styles.headline}>
          Beslenme bir ceza değil,
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(600).duration(700)} style={styles.headlineAccent}>
          bir yaşam biçimi.
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(1000).duration(600)} style={styles.body}>
          FitBite seni saymakla değil,{'\n'}hissetmekle tanıştıracak.
        </Animated.Text>
      </View>
      <Animated.View entering={FadeInDown.delay(1400).duration(500)} style={styles.footer}>
        <OnboardingButton title="Başlayalım →" onPress={onNext} variant="dark" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl * 2,
    paddingBottom: Spacing.xxl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  year: {
    fontSize: FontSize.hero * 1.5,
    fontWeight: '900',
    color: Colors.primaryLight + '40',
    lineHeight: FontSize.hero * 1.5,
    marginBottom: Spacing.lg,
  },
  headline: {
    fontSize: FontSize.xxxl,
    fontWeight: '300',
    color: Colors.textLight,
    lineHeight: FontSize.xxxl * 1.3,
  },
  headlineAccent: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.primaryLight,
    lineHeight: FontSize.xxxl * 1.3,
    marginBottom: Spacing.xl,
  },
  body: {
    fontSize: FontSize.lg,
    fontWeight: '400',
    color: Colors.textLight + 'CC',
    lineHeight: FontSize.lg * 1.6,
  },
  footer: {
    paddingTop: Spacing.xl,
  },
});
