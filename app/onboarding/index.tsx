import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { SlideInRight, SlideInLeft } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
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
import { AccountCreation } from '../../components/onboarding/steps/AccountCreation';
import { PhotoDemo } from '../../components/onboarding/steps/PhotoDemo';

// Hikaye adımları progress bar'da gösterilmez
const STORY_STEPS = new Set([0, 1, 5, 14]);
const TOTAL_STEPS = 19;

// Progress bar için veri adımı sayısı (19 - 4 hikaye = 15 veri adımı)
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
  const { setProfile, setSession } = useAuthStore();
  const { data, reset, currentStep, setStep } = useOnboardingData();
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [loading, setLoading] = useState(false);

  const goNext = useCallback(() => {
    setDirection('forward');
    setStep(Math.min(currentStep + 1, TOTAL_STEPS - 1));
  }, [currentStep, setStep]);

  const goBack = useCallback(() => {
    setDirection('back');
    setStep(Math.max(currentStep - 1, 0));
  }, [currentStep, setStep]);

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
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
        // Önceki başarısız denemeden kalan hesap var — giriş yap
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email.trim(),
          password: data.password,
        });
        if (signInError) {
          setLoading(false);
          Alert.alert('Hata', 'Bu e-posta zaten kullanımda. Farklı bir e-posta dene veya giriş ekranından giriş yap.');
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
      // E-posta doğrulaması gerekiyor
      setLoading(false);
      Alert.alert(
        'E-postanı Doğrula',
        `${data.email.trim()} adresine bir doğrulama bağlantısı gönderdik.\n\nE-postanı doğruladıktan sonra giriş yap.`,
        [{ text: 'Giriş Yap', onPress: () => router.replace('/(auth)/login') }],
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

    if (!data.gender || !data.activity_level || !data.goal || isNaN(heightCm) || isNaN(weightKg)) {
      setLoading(false);
      Alert.alert('Hata', 'Bazı bilgiler eksik. Lütfen geri dönüp kontrol et.');
      return;
    }

    const metrics = {
      gender: data.gender,
      age,
      height_cm: heightCm,
      weight_kg: weightKg,
      activity_level: data.activity_level,
      goal: data.goal,
    };

    const macros = calculateMacroGoals(metrics, data.weekly_weight_goal_kg);
    const monthPadded = String(parseInt(data.birth_month)).padStart(2, '0');
    const birth_date = birthYear ? `${birthYear}-${monthPadded}-01` : '2000-01-01';

    const profileData = {
      user_id: userId,
      name: data.name.trim(),
      gender: data.gender,
      birth_date,
      height_cm: heightCm,
      weight_kg: weightKg,
      target_weight_kg: parseFloat(data.target_weight_kg) || null,
      activity_level: data.activity_level,
      goal: data.goal,
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

  // Hikaye ekranlarında yatay kaydırma ile geçiş
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
      case 17: return <AccountCreation {...stepProps} />;
      case 18: return (
        <PhotoDemo
          onNext={handleFinish}
          onBack={goBack}
          loading={loading}
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
      {isStoryStep ? (
        <GestureDetector gesture={swipeGesture}>
          <Animated.View
            key={step}
            style={styles.stepWrapper}
          >
            {renderStep()}
          </Animated.View>
        </GestureDetector>
      ) : (
        <Animated.View
          key={step}
          entering={enteringAnim}
          style={styles.stepWrapper}
        >
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
