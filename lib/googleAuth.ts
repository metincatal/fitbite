import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export type GoogleAuthResult =
  | { ok: true }
  | { ok: false; reason: 'cancelled' | 'no-tokens' | 'error'; message?: string };

/**
 * Supabase signInWithOAuth → expo-web-browser ile OAuth pop-up'ını aç
 * → callback URL'sindeki access_token / refresh_token'ı yakala → setSession.
 *
 * Önkoşullar:
 * - Supabase Dashboard → Authentication → Providers → Google enabled
 *   ve OAuth Client ID + Secret tanımlı.
 * - Supabase URL Configuration → Redirect URLs listesinde "fitbite://auth/callback" var.
 * - app.json scheme: "fitbite" (zaten ayarlı).
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  const redirectTo = Linking.createURL('auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error || !data?.url) {
    return { ok: false, reason: 'error', message: error?.message ?? 'OAuth URL alınamadı' };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { ok: false, reason: 'cancelled' };
  }
  if (result.type !== 'success' || !result.url) {
    return { ok: false, reason: 'error', message: 'OAuth tamamlanmadı' };
  }

  const tokens = parseTokensFromUrl(result.url);
  if (!tokens) {
    return { ok: false, reason: 'no-tokens' };
  }

  const { error: setErr } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  if (setErr) {
    return { ok: false, reason: 'error', message: setErr.message };
  }

  return { ok: true };
}

function parseTokensFromUrl(url: string): { access_token: string; refresh_token: string } | null {
  // Supabase implicit flow → tokens fragment'ta gelir: fitbite://auth/callback#access_token=...&refresh_token=...
  // PKCE fallback → query'de "code" gelir; bunu setSession ile direkt çözemeyiz.
  const hashIdx = url.indexOf('#');
  if (hashIdx >= 0) {
    const fragment = url.substring(hashIdx + 1);
    const params = new URLSearchParams(fragment);
    const access = params.get('access_token');
    const refresh = params.get('refresh_token');
    if (access && refresh) return { access_token: access, refresh_token: refresh };
  }

  // PKCE: callback URL'inde ?code=... olabilir
  const queryIdx = url.indexOf('?');
  if (queryIdx >= 0) {
    const query = url.substring(queryIdx + 1).split('#')[0];
    const params = new URLSearchParams(query);
    const code = params.get('code');
    if (code) {
      // PKCE flow için exchangeCodeForSession kullanmak gerekir; ileride
      // Supabase project'te PKCE açılırsa bu dalı genişlet.
      return null;
    }
  }

  return null;
}
