import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  ACTIVITY_LEVELS,
  GOALS,
  DIET_TYPES,
  ActivityLevel,
  Goal,
  DietType,
} from '../../lib/constants';
import { calculateDailyCalorieGoal, calculateMacroGoals } from '../../lib/nutrition';
import { Button } from '../../components/ui/Button';

interface OnboardingData {
  name: string;
  gender: 'male' | 'female' | null;
  birth_year: string;
  height_cm: string;
  weight_kg: string;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
  diet_type: DietType;
}

const TOTAL_STEPS = 5;

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, setProfile } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    name: '',
    gender: null,
    birth_year: '',
    height_cm: '',
    weight_kg: '',
    activity_level: null,
    goal: null,
    diet_type: 'normal',
  });

  function update(key: keyof OnboardingData, value: any) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function canProceed(): boolean {
    switch (step) {
      case 1: return data.name.trim().length >= 2;
      case 2: return data.gender !== null && data.birth_year.length === 4;
      case 3: return data.height_cm.length > 0 && data.weight_kg.length > 0;
      case 4: return data.activity_level !== null;
      case 5: return data.goal !== null;
      default: return false;
    }
  }

  async function handleFinish() {
    if (!user) return;
    setLoading(true);

    const age = new Date().getFullYear() - parseInt(data.birth_year);
    const metrics = {
      gender: data.gender!,
      age,
      height_cm: parseFloat(data.height_cm),
      weight_kg: parseFloat(data.weight_kg),
      activity_level: data.activity_level!,
      goal: data.goal!,
    };

    const macros = calculateMacroGoals(metrics);
    const birth_date = `${data.birth_year}-01-01`;

    const profileData = {
      user_id: user.id,
      name: data.name.trim(),
      gender: data.gender!,
      birth_date,
      height_cm: parseFloat(data.height_cm),
      weight_kg: parseFloat(data.weight_kg),
      activity_level: data.activity_level!,
      goal: data.goal!,
      diet_type: data.diet_type,
      allergies: [],
      daily_calorie_goal: macros.calories,
      daily_protein_goal: macros.protein_g,
      daily_carbs_goal: macros.carbs_g,
      daily_fat_goal: macros.fat_g,
      daily_water_goal_ml: 2000,
    };

    const { data: profile, error } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    setLoading(false);

    if (error) {
      Alert.alert('Hata', 'Profil oluşturulurken bir hata oluştu. Lütfen tekrar dene.');
      return;
    }

    if (profile) {
      setProfile(profile);
      router.replace('/(tabs)');
    }
  }

  const progressWidth = `${(step / TOTAL_STEPS) * 100}%`;

  return (
    <SafeAreaView style={styles.container}>
      {/* İlerleme Çubuğu */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressWidth as any }]} />
        </View>
        <Text style={styles.progressText}>{step} / {TOTAL_STEPS}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Adım 1: İsim */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>👋</Text>
            <Text style={styles.stepTitle}>Merhaba! Adın nedir?</Text>
            <Text style={styles.stepSubtitle}>Seni nasıl çağıralım?</Text>
            <TextInput
              style={styles.bigInput}
              value={data.name}
              onChangeText={(v) => update('name', v)}
              placeholder="Adın ve soyadın"
              autoCapitalize="words"
              autoFocus
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        )}

        {/* Adım 2: Cinsiyet & Yaş */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>🧬</Text>
            <Text style={styles.stepTitle}>Biraz daha bilgi</Text>
            <Text style={styles.stepSubtitle}>Kalori hesaplama için gerekli</Text>

            <Text style={styles.fieldLabel}>Cinsiyetin</Text>
            <View style={styles.optionRow}>
              {[{ value: 'male', label: '👨 Erkek' }, { value: 'female', label: '👩 Kadın' }].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionCard, data.gender === opt.value && styles.optionCardSelected]}
                  onPress={() => update('gender', opt.value)}
                >
                  <Text style={[styles.optionLabel, data.gender === opt.value && styles.optionLabelSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Doğum Yılın</Text>
            <TextInput
              style={styles.bigInput}
              value={data.birth_year}
              onChangeText={(v) => update('birth_year', v)}
              placeholder="1990"
              keyboardType="numeric"
              maxLength={4}
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        )}

        {/* Adım 3: Boy & Kilo */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>📏</Text>
            <Text style={styles.stepTitle}>Boy ve kilonu girelim</Text>
            <Text style={styles.stepSubtitle}>BMI ve kalori hedefin hesaplanacak</Text>

            <Text style={styles.fieldLabel}>Boyun (cm)</Text>
            <TextInput
              style={styles.bigInput}
              value={data.height_cm}
              onChangeText={(v) => update('height_cm', v)}
              placeholder="170"
              keyboardType="numeric"
              maxLength={3}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Kilonuz (kg)</Text>
            <TextInput
              style={styles.bigInput}
              value={data.weight_kg}
              onChangeText={(v) => update('weight_kg', v)}
              placeholder="70"
              keyboardType="numeric"
              maxLength={5}
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        )}

        {/* Adım 4: Aktivite Seviyesi */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>🏃</Text>
            <Text style={styles.stepTitle}>Ne kadar aktifsin?</Text>
            <Text style={styles.stepSubtitle}>Günlük fiziksel aktiviteni seç</Text>
            {(Object.entries(ACTIVITY_LEVELS) as [ActivityLevel, { label: string; multiplier: number }][]).map(([key, val]) => (
              <TouchableOpacity
                key={key}
                style={[styles.listOption, data.activity_level === key && styles.listOptionSelected]}
                onPress={() => update('activity_level', key)}
              >
                <Text style={[styles.listOptionText, data.activity_level === key && styles.listOptionTextSelected]}>
                  {val.label}
                </Text>
                {data.activity_level === key && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Adım 5: Hedef & Diyet */}
        {step === 5 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>🎯</Text>
            <Text style={styles.stepTitle}>Hedefin ne?</Text>
            <Text style={styles.stepSubtitle}>Sana özel program oluşturalım</Text>

            <Text style={styles.fieldLabel}>Hedefin</Text>
            <View style={styles.optionRow}>
              {(Object.entries(GOALS) as [Goal, { label: string }][]).map(([key, val]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.optionCard, styles.optionCardSmall, data.goal === key && styles.optionCardSelected]}
                  onPress={() => update('goal', key)}
                >
                  <Text style={styles.goalEmoji}>
                    {key === 'lose' ? '📉' : key === 'maintain' ? '⚖️' : '📈'}
                  </Text>
                  <Text style={[styles.optionLabel, data.goal === key && styles.optionLabelSelected]}>
                    {val.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Diyet Tercihin</Text>
            {(Object.entries(DIET_TYPES) as [DietType, string][]).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.listOption, data.diet_type === key && styles.listOptionSelected]}
                onPress={() => update('diet_type', key)}
              >
                <Text style={[styles.listOptionText, data.diet_type === key && styles.listOptionTextSelected]}>
                  {label}
                </Text>
                {data.diet_type === key && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Navigasyon Butonları */}
      <View style={styles.navButtons}>
        {step > 1 && (
          <Button
            title="Geri"
            onPress={() => setStep((s) => s - 1)}
            variant="outline"
            style={styles.backButton}
          />
        )}
        <Button
          title={step === TOTAL_STEPS ? 'Başla!' : 'Devam Et'}
          onPress={step === TOTAL_STEPS ? handleFinish : () => setStep((s) => s + 1)}
          disabled={!canProceed()}
          loading={loading}
          style={styles.nextButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  progressText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textMuted },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  stepContent: { paddingTop: Spacing.xl },
  stepEmoji: { fontSize: 52, marginBottom: Spacing.md },
  stepTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm },
  stepSubtitle: { fontSize: FontSize.md, color: Colors.textMuted, marginBottom: Spacing.xl },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.md },
  bigInput: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontWeight: '600',
    backgroundColor: Colors.surface,
  },
  optionRow: { flexDirection: 'row', gap: Spacing.md },
  optionCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  optionCardSmall: { padding: Spacing.md },
  optionCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryPale },
  optionLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary },
  optionLabelSelected: { color: Colors.primary },
  goalEmoji: { fontSize: 28, marginBottom: Spacing.xs },
  listOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  listOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryPale },
  listOptionText: { fontSize: FontSize.md, fontWeight: '500', color: Colors.textSecondary },
  listOptionTextSelected: { color: Colors.primary, fontWeight: '700' },
  checkmark: { fontSize: FontSize.lg, color: Colors.primary, fontWeight: '700' },
  navButtons: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  backButton: { flex: 0.4 },
  nextButton: { flex: 1 },
});
