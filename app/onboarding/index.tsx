import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { SlideInRight, SlideInLeft } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingData } from '../../hooks/useOnboardingData';
import { calculateMacroGoals } from '../../lib/nutrition';
import { ProgressBar } from '../../components/onboarding/shared/ProgressBar';
import { Colors } from '../../lib/constants';

// Adım bileşenleri
import { StoryWelcome } from '../../components/onboarding/steps/StoryWelcome';
import { StoryManifesto } from '../../components/onboarding/steps/StoryManifesto';
import { NameInput } from '../../components/onboarding/steps/NameInput';
import { GenderBirthDate } from '../../components/onboarding/steps/GenderBirthDate';
import { BodyMetrics } from '../../components/onboarding/steps/BodyMetrics';
import { StoryLifestyle } from '../../components/onboarding/steps/StoryLifestyle';
import { MotivationSelect } from '../../components/onboarding/steps/MotivationSelect';
import { PastObstacles } from '../../components/onboarding/steps/PastObstacles';
import { ActivityLevel } from '../../components/onboarding/steps/ActivityLevel';
import { DietType } from '../../components/onboarding/steps/DietType';
import { Allergies } from '../../components/onboarding/steps/Allergies';
import { MealRhythm } from '../../components/onboarding/steps/MealRhythm';
import { MealTiming } from '../../components/onboarding/steps/MealTiming';
import { WeightGoalRate } from '../../components/onboarding/steps/WeightGoalRate';
import { StoryPrivacy } from '../../components/onboarding/steps/StoryPrivacy';
import { NotificationPrefs } from '../../components/onboarding/steps/NotificationPrefs';
import { AISummary } from '../../components/onboarding/steps/AISummary';
import { PhotoDemo } from '../../components/onboarding/steps/PhotoDemo';

// Hikaye adımları progress bar'da gösterilmez
const STORY_STEPS = new Set([0, 1, 5, 14]);
const TOTAL_STEPS = 18;

// Progress bar için veri adımı sayısı (18 - 4 hikaye = 14 veri adımı)
const DATA_STEPS = TOTAL_STEPS - STORY_STEPS.size;

function getDataStepIndex(step: number): number {
  let count = 0;
  for (let i = 0; i < step; i++) {
    if (!STORY_STEPS.has(i)) count++;
  }
  return count;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, setProfile } = useAuthStore();
  const { data, reset } = useOnboardingData();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [loading, setLoading] = useState(false);

  const goNext = useCallback(() => {
    setDirection('forward');
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection('back');
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  async function handleFinish() {
    if (!user) return;
    setLoading(true);

    const age = data.birth_year ? new Date().getFullYear() - parseInt(data.birth_year) : 25;
    const metrics = {
      gender: data.gender!,
      age,
      height_cm: parseFloat(data.height_cm),
      weight_kg: parseFloat(data.weight_kg),
      activity_level: data.activity_level!,
      goal: data.goal!,
    };

    const macros = calculateMacroGoals(metrics, data.weekly_weight_goal_kg);
    const birth_date = `${data.birth_year}-${String(parseInt(data.birth_month)).padStart(2, '0')}-01`;

    const profileData = {
      user_id: user.id,
      name: data.name.trim(),
      gender: data.gender!,
      birth_date,
      height_cm: parseFloat(data.height_cm),
      weight_kg: parseFloat(data.weight_kg),
      target_weight_kg: parseFloat(data.target_weight_kg) || null,
      activity_level: data.activity_level!,
      goal: data.goal!,
      diet_type: data.diet_type,
      allergies: data.allergies,
      motivations: data.motivations,
      past_obstacles: data.past_obstacles,
      meal_count: data.meal_count,
      first_meal_time: data.first_meal_time,
      last_meal_time: data.last_meal_time,
      weekly_weight_goal_kg: data.weekly_weight_goal_kg,
      notification_preferences: data.notification_preferences,
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
      reset();
      router.replace('/(tabs)');
    }
  }

  const showProgress = !STORY_STEPS.has(step);
  const dataStepIndex = getDataStepIndex(step);

  const enteringAnim = direction === 'forward'
    ? SlideInRight.duration(280)
    : SlideInLeft.duration(280);

  function renderStep() {
    const stepProps = { onNext: goNext, onBack: goBack };

    switch (step) {
      case 0:  return <StoryWelcome {...stepProps} />;
      case 1:  return <StoryManifesto {...stepProps} />;
      case 2:  return <NameInput {...stepProps} />;
      case 3:  return <GenderBirthDate {...stepProps} />;
      case 4:  return <BodyMetrics {...stepProps} />;
      case 5:  return <StoryLifestyle {...stepProps} />;
      case 6:  return <MotivationSelect {...stepProps} />;
      case 7:  return <PastObstacles {...stepProps} />;
      case 8:  return <ActivityLevel {...stepProps} />;
      case 9:  return <DietType {...stepProps} />;
      case 10: return <Allergies {...stepProps} />;
      case 11: return <MealRhythm {...stepProps} />;
      case 12: return <MealTiming {...stepProps} />;
      case 13: return <WeightGoalRate {...stepProps} />;
      case 14: return <StoryPrivacy {...stepProps} />;
      case 15: return <NotificationPrefs {...stepProps} />;
      case 16: return <AISummary {...stepProps} />;
      case 17: return (
        <PhotoDemo
          onNext={handleFinish}
          onBack={goBack}
        />
      );
      default: return null;
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {showProgress && (
        <ProgressBar current={dataStepIndex} total={DATA_STEPS} />
      )}
      <Animated.View
        key={step}
        entering={enteringAnim}
        style={styles.stepWrapper}
      >
        {renderStep()}
      </Animated.View>
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
