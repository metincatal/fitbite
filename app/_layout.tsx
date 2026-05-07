import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { checkAndRequestNotificationPermission, initNotificationHandler } from '../lib/notifications';

export default function RootLayout() {
  const { setSession, fetchProfile, session, profile, isLoading, profileFetched } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    initNotificationHandler(); // Foreground bildirimler için handler'ı erkenden kur
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          // Geçersiz/süresi dolmuş token — temizle ve login'e yönlendir
          supabase.auth.signOut().catch(() => {});
          setSession(null);
          return;
        }
        setSession(session);
        if (session) fetchProfile();
      })
      .catch(() => {
        supabase.auth.signOut().catch(() => {});
        setSession(null);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile();
      }
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
      // Bildirim izni kontrolü (sessiz — zaten varsa geçer, yoksa sistem diyaloğu gösterir)
      checkAndRequestNotificationPermission();
    } else if (session && !profile && profileFetched) {
      // fetchProfile tamamlandı ama profil DB'de yok: onboarding'e gönder
      if (!inOnboarding && !inAuthGroup) {
        router.replace('/onboarding');
      }
    }
    // session && !profile && !profileFetched: fetchProfile henüz bitmedi, bekle
  }, [session, profile, isLoading, profileFetched, segments]);

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
        <Stack.Screen name="exercise" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
