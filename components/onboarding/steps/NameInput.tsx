// Onboarding 03 — Name
// Alt çizgili serif input, canlı "Merhaba {isim}" önizleme.

import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import {
  OnbColors, OnbShell, OnbHead, OnbFoot, SERIF, MONO,
} from '../shared/OnbDesign';
import { useOnboardingData } from '../../../hooks/useOnboardingData';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function NameInput({ onNext, onBack }: Props) {
  const { data, updateField } = useOnboardingData();
  const name = data.name;
  const isValid = name.trim().length >= 2;

  return (
    <OnbShell step={1} total={26}>
      <OnbHead
        kicker="Tanışalım"
        title="Sana ne diye"
        italic="hitap edelim?"
        subtitle="FitBot mesajlarında bu ismi kullanacak. Takma ad da olur — kimliğini doğrulamıyoruz."
      />

      <View style={styles.body}>
        <Text style={styles.inputLabel}>ADIN ↓</Text>
        <View style={styles.inputWrap}>
          <TextInput
            value={name}
            onChangeText={(v) => updateField('name', v.slice(0, 24))}
            placeholder="Adın"
            placeholderTextColor={OnbColors.ink4}
            autoCapitalize="words"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => isValid && onNext()}
            style={styles.input}
          />
          <Text style={styles.charCount}>{name.length} / 24</Text>
        </View>

        <View style={styles.hintRow}>
          <View style={styles.hintDot}>
            <Text style={styles.hintDotText}>i</Text>
          </View>
          <Text style={styles.hintText}>
            FitBot mesajlarına{' '}
            <Text style={{ fontStyle: 'italic', color: OnbColors.ink }}>
              "Merhaba {name || 'Adın'},"
            </Text>{' '}
            diye başlayacak.
          </Text>
        </View>
      </View>

      <OnbFoot
        cta="Memnun oldum"
        onNext={onNext}
        onBack={onBack}
        dim={!isValid}
      />
    </OnbShell>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  inputLabel: {
    fontSize: 9.5,
    letterSpacing: 2.2,
    color: OnbColors.ink3,
    fontFamily: MONO,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputWrap: {
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: OnbColors.ink,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 36,
    fontFamily: SERIF,
    color: OnbColors.ink,
    letterSpacing: -0.5,
    backgroundColor: 'transparent',
  },
  charCount: {
    position: 'absolute',
    right: 0,
    bottom: 14,
    fontSize: 10,
    fontFamily: MONO,
    color: OnbColors.ink3,
    letterSpacing: 1.6,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 24,
  },
  hintDot: {
    width: 18,
    height: 18,
    borderRadius: 99,
    backgroundColor: OnbColors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  hintDotText: {
    color: OnbColors.bg,
    fontSize: 10,
    fontFamily: MONO,
  },
  hintText: {
    flex: 1,
    fontSize: 12.5,
    color: OnbColors.ink2,
    lineHeight: 19,
  },
});
