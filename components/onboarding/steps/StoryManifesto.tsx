import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Spacing, FontSize } from '../../../lib/constants';
import { OnboardingButton } from '../shared/OnboardingButton';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const VALUES = [
  { left: 'Sezgi', right: 'Kısıtlama', delay: 200 },
  { left: 'Şefkat', right: 'Ceza', delay: 400 },
  { left: 'Denge', right: 'Aşırılık', delay: 600 },
  { left: 'Keyif', right: 'Suçluluk', delay: 800 },
];

export function StoryManifesto({ onNext, onBack }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.Text entering={FadeInDown.delay(100).duration(600)} style={styles.overline}>
          FitBite Felsefesi
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(600)} style={styles.title}>
          Biz böyle{'\n'}inanıyoruz:
        </Animated.Text>

        <View style={styles.valuesContainer}>
          {VALUES.map((v, i) => (
            <Animated.View
              key={i}
              entering={FadeInDown.delay(v.delay).duration(500)}
              style={styles.valueRow}
            >
              <Animated.Text style={styles.valueLeft}>{v.left}</Animated.Text>
              <Animated.Text style={styles.valueSeparator}>{'>'}</Animated.Text>
              <Animated.Text style={styles.valueRight}>{v.right}</Animated.Text>
            </Animated.View>
          ))}
        </View>

        <Animated.Text entering={FadeInDown.delay(1100).duration(600)} style={styles.noRule}>
          İLAÇ YOK · KISIT YOK · YARGI YOK
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInDown.delay(1400).duration(400)} style={styles.footer}>
        <OnboardingButton title="Devam Et" onPress={onNext} variant="dark" />
        <OnboardingButton title="Geri" onPress={onBack} variant="ghost" style={styles.backBtn} />
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
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
  content: { flex: 1, justifyContent: 'center' },
  overline: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryLight,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.textLight,
    lineHeight: FontSize.xxxl * 1.3,
    marginBottom: Spacing.xl,
  },
  valuesContainer: { gap: Spacing.md, marginBottom: Spacing.xl },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  valueLeft: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.primaryLight,
    flex: 1,
  },
  valueSeparator: {
    fontSize: FontSize.xl,
    color: Colors.primaryLight + '60',
    fontWeight: '300',
  },
  valueRight: {
    fontSize: FontSize.xl,
    fontWeight: '300',
    color: Colors.textLight + '50',
    textDecorationLine: 'line-through',
    flex: 1,
    textAlign: 'right',
  },
  noRule: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primaryLight + '80',
    letterSpacing: 2,
    textAlign: 'center',
  },
  footer: { gap: Spacing.sm },
  backBtn: { marginTop: -Spacing.sm },
});
