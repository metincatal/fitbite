import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { SlideInRight, SlideInLeft } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingData } from '../../hooks/useOnboardingData';
import {
  calculateMacroGoals,
  calculateBMI,
  calculateBMR,
  evaluateSafety,
  calculateScoffScore,
  UserMetrics,
} from '../../lib/nutrition';
import { ProgressBar } from '../../components/onboarding/shared/ProgressBar';
import { Colors, getBodyFatPercentageFromBand } from '../../lib/constants';

// Adım bileşenleri
import { StoryWelcome } from '../../components/onboarding/steps/StoryWelcome';
import { StoryManifesto } from '../../components/onboarding/steps/StoryManifesto';
import { NameInput } from '../../components/onboarding/steps/NameInput';
import { TTMStage } from '../../components/onboarding/steps/TTMStage';
import { GenderBirthDate } from '../../components/onboarding/steps/GenderBirthDate';
import { ScoffScreening } from '../../components/onboarding/steps/ScoffScreening';
import { MedicalConditions } from '../../components/onboarding/steps/MedicalConditions';
import { BodyMetrics } from '../../components/onboarding/steps/BodyMetrics';
import { BodyFatBand } from '../../components/onboarding/steps/BodyFatBand';
import { StoryLifestyle } from '../../components/onboarding/steps/StoryLifestyle';
import { MotivationSelect } from '../../components/onboarding/steps/MotivationSelect';
import { PastObstacles } from '../../components/onboarding/steps/PastObstacles';
import { OccupationalActivity } from '../../components/onboarding/steps/OccupationalActivity';
import { ExerciseFrequency } from '../../components/onboarding/steps/ExerciseFrequency';
import { DietType } from '../../components/onboarding/steps/DietType';
import { Allergies } from '../../components/onboarding/steps/Allergies';
import { MealRhythm } from '../../components/onboarding/steps/MealRhythm';
import { MealTiming } from '../../components/onboarding/steps/MealTiming';
import { WeightGoalRate } from '../../components/onboarding/steps/WeightGoalRate';
import { StoryPrivacy } from '../../components/onboarding/steps/StoryPrivacy';
import { NotificationPrefs } from '../../components/onboarding/steps/NotificationPrefs';
import { ScientificPlanPreview } from '../../components/onboarding/steps/ScientificPlanPreview';
import { AccountCreation } from '../../components/onboarding/steps/AccountCreation';
import { PhotoDemo } from '../../components/onboarding/steps/PhotoDemo';

// v2 Step sırası (24 adım)
// 0  StoryWelcome (story)
// 1  StoryManifesto (story)
// 2  NameInput
// 3  TTMStage (YENİ)
// 4  GenderBirthDate
// 5  ScoffScreening (YENİ)
// 6  MedicalConditions (YENİ)
// 7  BodyMetrics
// 8  BodyFatBand (YENİ, opsiyonel)
// 9  StoryLifestyle (story)
// 10 MotivationSelect
// 11 PastObstacles
// 12 OccupationalActivity (YENİ)
// 13 ExerciseFrequency (YENİ)
// 14 DietType
// 15 Allergies
// 16 MealRhythm
// 17 MealTiming
// 18 WeightGoalRate
// 19 StoryPrivacy (story)
// 20 NotificationPrefs
// 21 ScientificPlanPreview (YENİ — AISummary yerine)
// 22 AccountCreation
// 23 PhotoDemo

const STORY_STEPS = new Set([0, 1, 9, 19]);
const TOTAL_STEPS = 24;
const DATA_STEPS = TOTAL_STEPS - STORY_STEPS.size;

// WeightGoalRate adımı — hamilelik varsa otomatik atla
const WEIGHT_GOAL_RATE_STEP = 18;

function getDataStepIndex(step: number): number {
  let count = 0;
  for (let i = 0; i < step; i++) {
    if (!STORY_STEPS.has(i)) count++;
  }
  return count;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { setProfile, setSession } = useAuthStore();
  const { data, reset, currentStep, setStep } = useOnboardingData();
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [loading, setLoading] = useState(false);

  const isPregnant = (data.medical_conditions ?? []).includes('pregnancy');

  const goNext = useCallback(() => {
    setDirection('forward');
    // Hamilelik varsa WeightGoalRate'i atla
    const next = currentStep + 1;
    if (next === WEIGHT_GOAL_RATE_STEP && isPregnant) {
      setStep(Math.min(next + 1, TOTAL_STEPS - 1));
    } else {
      setStep(Math.min(next, TOTAL_STEPS - 1));
    }
  }, [currentStep, isPregnant, setStep]);

  const goBack = useCallback(() => {
    setDirection('back');
    const prev = currentStep - 1;
    if (prev === WEIGHT_GOAL_RATE_STEP && isPregnant) {
      setStep(Math.max(prev - 1, 0));
    } else {
      setStep(Math.max(prev, 0));
    }
  }, [currentStep, isPregnant, setStep]);

  // Hamilelik seçilirse weekly_weight_goal_kg'yi sıfırla ve goal'u maintain'e çek
  useEffect(() => {
    if (isPregnant && data.weekly_weight_goal_kg !== 0) {
      useOnboardingData.setState((s) => ({
        data: { ...s.data, weekly_weight_goal_kg: 0, goal: 'maintain' },
      }));
    }
  }, [isPregnant, data.weekly_weight_goal_kg]);

  async function handleFinish() {
    setLoading(true);

    let userId: string;

    // 1. Hesap oluştur (zaten varsa giriş yap)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: { data: { name: data.name.trim() } },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (
        msg.includes('already registered') ||
        msg.includes('already exists') ||
        msg.includes('user already')
      ) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email.trim(),
          password: data.password,
        });
        if (signInError) {
          setLoading(false);
          Alert.alert(
            'Hata',
            'Bu e-posta zaten kullanımda. Farklı bir e-posta dene veya giriş ekranından giriş yap.'
          );
          return;
        }
        userId = signInData.user!.id;
        if (signInData.session) setSession(signInData.session);
      } else {
        setLoading(false);
        Alert.alert('Hata', authError.message);
        return;
      }
    } else if (!authData.user) {
      setLoading(false);
      Alert.alert('Hata', 'Hesap oluşturulamadı. Lütfen tekrar dene.');
      return;
    } else if (!authData.session) {
      setLoading(false);
      Alert.alert(
        'E-postanı Doğrula',
        `${data.email.trim()} adresine bir doğrulama bağlantısı gönderdik.\n\nE-postanı doğruladıktan sonra giriş yap.`,
        [{ text: 'Giriş Yap', onPress: () => router.replace('/(auth)/login') }]
      );
      return;
    } else {
      userId = authData.user.id;
      setSession(authData.session);
    }

    // 2. Profil oluştur
    const birthYear = parseInt(data.birth_year);
    const age = birthYear && !isNaN(birthYear) ? new Date().getFullYear() - birthYear : 25;
    const heightCm = parseFloat(data.height_cm);
    const weightKg = parseFloat(data.weight_kg);

    if (!data.gender || !data.goal || isNaN(heightCm) || isNaN(weightKg)) {
      setLoading(false);
      Alert.alert('Hata', 'Bazı bilgiler eksik. Lütfen geri dönüp kontrol et.');
      return;
    }

    // Güvenlik değerlendirmesi → blocker varsa goal'u maintain'e zorla
    const bmi = calculateBMI(weightKg, heightCm);
    const scoffScore = calculateScoffScore(data.scoff_answers);

    const preMetrics: UserMetrics = {
      gender: data.gender,
      age,
      height_cm: heightCm,
      weight_kg: weightKg,
      goal: data.goal,
      activity_level: data.activity_level ?? 'moderate',
      occupational_activity: data.occupational_activity ?? undefined,
      exercise_frequency: data.exercise_frequency ?? undefined,
      body_fat_band: data.body_fat_band ?? undefined,
    };

    const preMacros = calculateMacroGoals(preMetrics, data.weekly_weight_goal_kg);
    const safety = evaluateSafety({
      bmi,
      scoff_score: scoffScore,
      medical_conditions: data.medical_conditions,
      weekly_goal_kg: data.weekly_weight_goal_kg,
      weight_kg: weightKg,
      amdr_flags: preMacros.amdr_flags,
    });

    const effectiveGoal = safety.canProceed ? data.goal : 'maintain';
    const effectiveWeekly = safety.canProceed ? data.weekly_weight_goal_kg : 0;

    const metrics: UserMetrics = { ...preMetrics, goal: effectiveGoal };
    const macros = calculateMacroGoals(metrics, effectiveWeekly);
    const bmrResult = calculateBMR(metrics);

    const monthPadded = String(parseInt(data.birth_month)).padStart(2, '0');
    const birth_date = birthYear ? `${birthYear}-${monthPadded}-01` : '2000-01-01';

    const bodyFatPct = data.body_fat_band
      ? getBodyFatPercentageFromBand(data.body_fat_band, data.gender)
      : null;

    const profileData = {
      user_id: userId,
      name: data.name.trim(),
      gender: data.gender,
      birth_date,
      height_cm: heightCm,
      weight_kg: weightKg,
      target_weight_kg: parseFloat(data.target_weight_kg) || null,
      activity_level: data.activity_level ?? 'moderate',
      goal: effectiveGoal,
      diet_type: data.diet_type,
      allergies: data.allergies,
      motivations: data.motivations,
      past_obstacles: data.past_obstacles,
      meal_count: data.meal_count,
      first_meal_time: data.first_meal_time,
      last_meal_time: data.last_meal_time,
      weekly_weight_goal_kg: effectiveWeekly,
      notification_preferences: data.notification_preferences,
      daily_calorie_goal: macros.calories,
      daily_protein_goal: macros.protein_g,
      daily_carbs_goal: macros.carbs_g,
      daily_fat_goal: macros.fat_g,
      daily_water_goal_ml: 2000,

      // v2 alanları
      ttm_stage: data.ttm_stage,
      scoff_answers: data.scoff_answers,
      scoff_score: scoffScore,
      medical_conditions: data.medical_conditions,
      occupational_activity: data.occupational_activity,
      exercise_frequency: data.exercise_frequency,
      body_fat_band: data.body_fat_band,
      body_fat_percentage: bodyFatPct,
      bmr_formula: bmrResult.formula,
      safety_flags: {
        canProceed: safety.canProceed,
        blockers: safety.blockers,
        warnings: safety.warnings,
      },
    };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'user_id' })
      .select()
      .single();

    setLoading(false);

    if (profileError) {
      Alert.alert('Hata', `Profil oluşturulurken hata: ${profileError.message}`);
      return;
    }

    if (profile) {
      setProfile(profile);
      reset();
      router.replace('/(tabs)');
    }
  }

  const step = currentStep;
  const isStoryStep = STORY_STEPS.has(step);
  const showProgress = !isStoryStep;
  const dataStepIndex = getDataStepIndex(step);

  const enteringAnim = isStoryStep
    ? undefined
    : direction === 'forward'
      ? SlideInRight.duration(280)
      : SlideInLeft.duration(280);

  const swipeGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(30)
    .onEnd((e) => {
      const isHorizontal = Math.abs(e.translationX) > Math.abs(e.translationY) * 1.5;
      if (!isHorizontal || Math.abs(e.translationX) < 50) return;
      if (e.translationX < 0) {
        goNext();
      } else if (step > 0) {
        goBack();
      }
    });

  function renderStep() {
    const stepProps = { onNext: goNext, onBack: goBack };

    switch (step) {
      case 0:  return <StoryWelcome {...stepProps} />;
      case 1:  return <StoryManifesto {...stepProps} />;
      case 2:  return <NameInput {...stepProps} />;
      case 3:  return <TTMStage {...stepProps} />;
      case 4:  return <GenderBirthDate {...stepProps} />;
      case 5:  return <ScoffScreening {...stepProps} />;
      case 6:  return <MedicalConditions {...stepProps} />;
      case 7:  return <BodyMetrics {...stepProps} />;
      case 8:  return <BodyFatBand {...stepProps} />;
      case 9:  return <StoryLifestyle {...stepProps} />;
      case 10: return <MotivationSelect {...stepProps} />;
      case 11: return <PastObstacles {...stepProps} />;
      case 12: return <OccupationalActivity {...stepProps} />;
      case 13: return <ExerciseFrequency {...stepProps} />;
      case 14: return <DietType {...stepProps} />;
      case 15: return <Allergies {...stepProps} />;
      case 16: return <MealRhythm {...stepProps} />;
      case 17: return <MealTiming {...stepProps} />;
      case 18: return <WeightGoalRate {...stepProps} />;
      case 19: return <StoryPrivacy {...stepProps} />;
      case 20: return <NotificationPrefs {...stepProps} />;
      case 21: return <ScientificPlanPreview {...stepProps} />;
      case 22: return <AccountCreation {...stepProps} />;
      case 23: return <PhotoDemo onNext={handleFinish} onBack={goBack} loading={loading} />;
      default: return null;
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {showProgress && <ProgressBar current={dataStepIndex} total={DATA_STEPS} />}
      {isStoryStep ? (
        <GestureDetector gesture={swipeGesture}>
          <Animated.View key={step} style={styles.stepWrapper}>
            {renderStep()}
          </Animated.View>
        </GestureDetector>
      ) : (
        <Animated.View key={step} entering={enteringAnim} style={styles.stepWrapper}>
          {renderStep()}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  stepWrapper: {
    flex: 1,
  },
});
