// Bilimsel motorun çıktısını kullanıcı profil bağlamında işleyen saf fonksiyonlar.
// SCOFF/TTM/safety_flags ile motor sonucu arasındaki köprü.

import type { Profile } from '../types';
import type { SafetyFlags } from '../types/database';
import type { TTMStage } from './constants';

export interface DailyTotalsContext {
  consumed: { kcal: number; protein: number; carbs: number; fat: number };
  goals?: { kcal: number; protein: number; carbs: number; fat: number };
  profile: Pick<Profile, 'safety_flags' | 'ttm_stage' | 'scoff_score'> | null;
}

export interface PolicyView {
  // UI'a hangi mesaj gösterilsin
  primaryMessage: string;
  // Açık/fazla göstergesi suppress edilmeli mi (SCOFF positive ise)
  suppressDeficit: boolean;
  // AMDR barlarını renksiz çiz (sadece bilgi, hedef yok)
  desaturateMacroBars: boolean;
  // Breakdown sheet'inde hangi tonda kopya kullanılsın
  breakdownTone: 'awareness' | 'benefit' | 'goal_progress' | 'data_focus' | 'maintenance';
}

function isScoffPositive(flags?: SafetyFlags | null, score?: number | null): boolean {
  if (typeof score === 'number' && score >= 2) return true;
  return !!flags?.blockers?.includes('scoff_positive');
}

function isUnderweight(flags?: SafetyFlags | null): boolean {
  return !!flags?.blockers?.includes('underweight_bmi');
}

function ttmTone(stage: TTMStage | null | undefined): PolicyView['breakdownTone'] {
  switch (stage) {
    case 'precontemplation':
      return 'awareness';
    case 'contemplation':
      return 'benefit';
    case 'preparation':
    case 'action':
      return 'goal_progress';
    case 'maintenance':
      return 'maintenance';
    default:
      return 'data_focus';
  }
}

// Günlük toplam kart için politika.
// SCOFF positive → kalori açığı/fazla mesajını gizle, denge mesajına geç.
// Underweight → benzer; kilo verme dilini suppress.
export function evaluateDailyTotals(ctx: DailyTotalsContext): PolicyView {
  const flags = ctx.profile?.safety_flags ?? null;
  const score = ctx.profile?.scoff_score ?? null;
  const stage = (ctx.profile?.ttm_stage ?? null) as TTMStage | null;

  const scoffBlock = isScoffPositive(flags, score);
  const underweightBlock = isUnderweight(flags);
  const suppressDeficit = scoffBlock || underweightBlock;

  let primaryMessage: string;
  if (scoffBlock) {
    primaryMessage = 'Bugün dengeli yiyorsun. Sayılara değil, kendine iyi gelene odaklan.';
  } else if (underweightBlock) {
    primaryMessage = 'Bugünün önceliği yeterli enerji almak. Açık takibi kapalı.';
  } else if (ctx.goals) {
    const remaining = Math.max(0, Math.round(ctx.goals.kcal - ctx.consumed.kcal));
    primaryMessage =
      remaining > 0
        ? `Hedefe ${remaining} kcal kaldı.`
        : `Hedef tamamlandı (+${Math.round(ctx.consumed.kcal - ctx.goals.kcal)} kcal).`;
  } else {
    primaryMessage = `Bugün toplam ${Math.round(ctx.consumed.kcal)} kcal aldın.`;
  }

  return {
    primaryMessage,
    suppressDeficit,
    desaturateMacroBars: scoffBlock,
    breakdownTone: scoffBlock ? 'awareness' : ttmTone(stage),
  };
}

// Breakdown sheet'inde kullanılacak ton-spesifik kopya.
export function breakdownCopy(
  tone: PolicyView['breakdownTone'],
  itemName: string,
  kcal: number,
  goalKcal?: number
): string {
  const pctOfGoal = goalKcal && goalKcal > 0 ? Math.round((kcal / goalKcal) * 100) : null;
  switch (tone) {
    case 'awareness':
      return `${itemName} kaydedildi. Bugün ne yediğini görüyorsun — bu farkındalık başlangıçtır.`;
    case 'benefit':
      return `${itemName} ${kcal} kcal. Düzenli kayıt, alışkanlığı görmenin en kolay yolu.`;
    case 'goal_progress':
      return pctOfGoal !== null
        ? `${itemName} bu öğünle günlük hedefinin %${pctOfGoal}'ini karşıladı.`
        : `${itemName} ${kcal} kcal — hedefin yolunda.`;
    case 'data_focus':
      return `${itemName}: ${kcal} kcal. Hesap deterministik, tüm çarpanlar görünür.`;
    case 'maintenance':
      return `${itemName} ${kcal} kcal. Sürdürdüğün rutin işliyor; trend lehine.`;
  }
}
