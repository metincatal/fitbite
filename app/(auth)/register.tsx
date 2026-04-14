import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/onboarding');
  }, []);

  return null;
}
