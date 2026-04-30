// Onboarding 21 — Notifications
// Toggle list + sample notification preview box.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  OnbColors, OnbShell, OnbHead, OnbFoot, SERIF, MONO,
} from '../shared/OnbDesign';
import { useOnboardingData } from '../../../hooks/useOnboardingData';
import { NotificationPreferences } from '../../../types/database';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const ITEMS: { k: keyof NotificationPreferences; label: string; hint: string }[] = [
  { k: 'meals',         label: 'Öğün hatırlatıcıları', hint: 'Seçtiğin öğün saatlerinde bildirim al' },
  { k: 'water',         label: 'Su hatırlatıcıları',   hint: 'Günlük su hedefine ulaşman için' },
  { k: 'weekly_report', label: 'Haftalık rapor',        hint: 'Her Pazartesi beslenme özeti' },
  { k: 'motivation',    label: 'Motivasyon mesajları',  hint: "FitBot'tan kişisel ilham notları" },
];

function Toggle({ on }: { on: boolean }) {
  return (
    <View style={[styles.toggle, on && styles.toggleOn]}>
      <View style={[styles.knob, on && styles.knobOn]} />
    </View>
  );
}

export function NotificationPrefs({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const prefs = data.notification_preferences;

  const toggle = (key: keyof NotificationPreferences) => {
    updateField('notification_preferences', { ...prefs, [key]: !prefs[key] });
  };

  return (
    <OnbShell step={17} total={26}>
      <OnbHead
        kicker="Bildirimler"
        title="Ne sıklıkla"
        italic="hatırlatalım?"
        subtitle="İstediğin zaman değiştirebilirsin. Sessiz saatleri Profil'den ayarlayabilirsin."
      />

      <View style={styles.body}>
        {ITEMS.map((it, i) => {
          const on = !!prefs[it.k];
          const isLast = i === ITEMS.length - 1;
          return (
            <TouchableOpacity
              key={it.k}
              onPress={() => toggle(it.k)}
              style={[styles.row, isLast && styles.rowLast]}
              activeOpacity={0.8}
            >
              <Text style={styles.num}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={styles.rowBody}>
                <Text style={[styles.rowLabel, on && styles.rowLabelOn]}>
                  {it.label}
                </Text>
                <Text style={styles.rowHint}>{it.hint}</Text>
              </View>
              <Toggle on={on} />
            </TouchableOpacity>
          );
        })}

        {/* Sample notification */}
        <View style={styles.preview}>
          <Text style={styles.previewMeta}>FITBITE · BUGÜN · 12:55</Text>
          <Text style={styles.previewText}>
            Öğle vakti —{' '}
            <Text style={styles.previewItalic}>tabağını dinle</Text>.
          </Text>
        </View>
      </View>

      <OnbFoot onNext={onNext} onBack={onBack} />
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 22,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderTopWidth: 0.5,
    borderTopColor: OnbColors.line,
  },
  rowLast: {
    borderBottomWidth: 0.5,
    borderBottomColor: OnbColors.line,
  },
  num: {
    fontSize: 9,
    letterSpacing: 1.8,
    fontFamily: MONO,
    color: OnbColors.ink3,
    width: 24,
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 19,
    fontFamily: SERIF,
    color: OnbColors.ink,
  },
  rowLabelOn: {
    color: OnbColors.terracotta,
    fontStyle: 'italic',
  },
  rowHint: {
    fontSize: 12,
    color: OnbColors.ink3,
    marginTop: 2,
  },
  toggle: {
    width: 44,
    height: 22,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: OnbColors.ink,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: {
    backgroundColor: OnbColors.ink,
  },
  knob: {
    width: 17,
    height: 17,
    borderRadius: 999,
    backgroundColor: OnbColors.ink,
  },
  knobOn: {
    backgroundColor: OnbColors.terracotta,
    alignSelf: 'flex-end',
  },
  preview: {
    marginTop: 18,
    padding: 14,
    backgroundColor: OnbColors.ink,
  },
  previewMeta: {
    fontSize: 9,
    letterSpacing: 3.2,
    fontFamily: MONO,
    color: 'rgba(242,239,230,0.55)',
  },
  previewText: {
    fontSize: 16,
    fontFamily: SERIF,
    color: OnbColors.bg,
    marginTop: 4,
  },
  previewItalic: {
    fontStyle: 'italic',
    color: OnbColors.terracotta,
  },
});
