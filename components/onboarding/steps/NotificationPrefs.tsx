import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../lib/constants';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { StepContainer } from '../shared/StepContainer';
import { OnboardingButton } from '../shared/OnboardingButton';
import { NotificationPreferences } from '../../../types/database';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const NOTIF_OPTIONS: {
  key: keyof NotificationPreferences;
  icon: string;
  title: string;
  desc: string;
}[] = [
  {
    key: 'meals',
    icon: 'restaurant-outline',
    title: 'Öğün Hatırlatıcıları',
    desc: 'Seçtiğin öğün saatlerinde bildirim al',
  },
  {
    key: 'water',
    icon: 'water-outline',
    title: 'Su Hatırlatıcıları',
    desc: 'Günlük su hedefine ulaşman için',
  },
  {
    key: 'weekly_report',
    icon: 'bar-chart-outline',
    title: 'Haftalık Rapor',
    desc: 'Her Pazartesi beslenme özeti',
  },
  {
    key: 'motivation',
    icon: 'heart-outline',
    title: 'Motivasyon Mesajları',
    desc: 'FitBot\'tan kişisel ilham notları',
  },
];

export function NotificationPrefs({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const prefs = data.notification_preferences;

  function toggle(key: keyof NotificationPreferences) {
    updateField('notification_preferences', {
      ...prefs,
      [key]: !prefs[key],
    });
  }

  return (
    <StepContainer scrollable={false}>
      <View style={styles.inner}>
        <Animated.Text entering={FadeInDown.delay(0).duration(500)} style={styles.emoji}>
          🔔
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={styles.title}>
          Bildirim{'\n'}tercihlerin
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
          İstediğin zaman değiştirebilirsin
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.list}>
          {NOTIF_OPTIONS.map((opt) => {
            const active = prefs[opt.key];
            return (
              <View key={opt.key} style={styles.item}>
                <View style={[styles.iconBox, active && styles.iconBoxActive]}>
                  <Ionicons
                    name={opt.icon as any}
                    size={22}
                    color={active ? Colors.primary : Colors.textMuted}
                  />
                </View>
                <View style={styles.itemText}>
                  <Text style={styles.itemTitle}>{opt.title}</Text>
                  <Text style={styles.itemDesc}>{opt.desc}</Text>
                </View>
                <View
                  style={[styles.toggle, active && styles.toggleActive]}
                  onTouchEnd={() => toggle(opt.key)}
                >
                  <View style={[styles.knob, active && styles.knobActive]} />
                </View>
              </View>
            );
          })}
        </Animated.View>

        <View style={styles.footer}>
          <OnboardingButton title="Devam Et →" onPress={onNext} />
          <OnboardingButton title="Geri" onPress={onBack} variant="ghost" />
        </View>
      </View>
    </StepContainer>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1, justifyContent: 'space-between' },
  emoji: { fontSize: 52, marginBottom: Spacing.md },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: FontSize.xxxl * 1.2,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
  },
  list: { gap: Spacing.md, flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: Colors.primaryPale + '40',
  },
  itemText: { flex: 1 },
  itemTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: { backgroundColor: Colors.primary },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  knobActive: { transform: [{ translateX: 20 }] },
  footer: { gap: Spacing.sm, paddingTop: Spacing.md },
});
