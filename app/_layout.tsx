import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const { setSession, fetchProfile, session, profile, isLoading } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading || !mounted.current) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';

    if (!session) {
      // Oturum yok: auth ekranlarına yönlendir (onboarding'e izin ver)
      if (!inAuthGroup && !inOnboarding) {
        router.replace('/(auth)/login');
      }
    } else if (session && profile) {
      // Oturum + profil var: doğrudan tabs'a
      if (inAuthGroup || inOnboarding) {
        router.replace('/(tabs)');
      }
    } else if (session && !profile && !inOnboarding && !inAuthGroup && !inTabs) {
      // Oturum var ama profil yok ve uygun ekranda değil: onboarding'e
      router.replace('/onboarding');
    }
  }, [session, profile, isLoading, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="shopping-list" />
        <Stack.Screen name="food/[id]" />
        <Stack.Screen name="recipe" />
      </Stack>
    </GestureHandlerRootView>
  );
}
