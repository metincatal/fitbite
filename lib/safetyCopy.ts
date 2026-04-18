import type { SafetyBlocker, SafetyWarning } from './nutrition';

export interface SafetyCopyEntry {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  tone: 'blocker' | 'warning';
  emoji: string;
}

export const SAFETY_COPY: Record<SafetyBlocker | SafetyWarning, SafetyCopyEntry> = {
  underweight_bmi: {
    tone: 'blocker',
    emoji: '🔒',
    title: 'Sağlıklı aralığın altındasın',
    body: "BMI'n 18.5'in altında. Kalori açığı yerine sağlıklı dengeleme planı hazırladık. Kilo alımı hedefliyorsan bir diyetisyenle görüşmeni öneririz.",
    ctaLabel: 'Uzmana Danış',
    ctaUrl: 'https://tdd.org.tr',
  },
  scoff_positive: {
    tone: 'blocker',
    emoji: '🔒',
    title: 'Destek almanı öneriyoruz',
    body: "Verdiğin cevaplar, bir diyetisyen veya ruh sağlığı uzmanıyla görüşmenin faydalı olacağını gösteriyor. FitBite'ı destek aracı olarak kullanmaya devam edebilirsin — planın kilo vermeye odaklanmayacak.",
    ctaLabel: 'Uzmana Danış',
    ctaUrl: 'https://tdd.org.tr',
  },
  rate_too_aggressive: {
    tone: 'warning',
    emoji: '⚠️',
    title: 'Tempo çok hızlı',
    body: "Seçtiğin haftalık hedef vücut ağırlığının %1'inden fazla. Bu tempo kas kaybı ve metabolik yavaşlamaya yol açar. Daha dengeli bir tempo öneririz.",
  },
  chronic_disease: {
    tone: 'warning',
    emoji: '⚠️',
    title: 'Sağlık durumunu gözetiyoruz',
    body: 'Seçtiğin kronik durum için öneriler doktor kontrolünde uygulanmalı. FitBot da her ciddi değişiklikte doktorunu ekleyecek.',
  },
  pregnancy: {
    tone: 'warning',
    emoji: '🤰',
    title: 'Hamilelik planı',
    body: 'Hamilelikte kalori açığı uygulanmaz. Planın dengeleme + besin yoğunluğu odaklı. Folik asit, demir, kalsiyum önerilerini göz önünde bulunduracağız.',
  },
  lactation: {
    tone: 'warning',
    emoji: '🤱',
    title: 'Emzirme dönemi',
    body: 'Emzirme döneminde 300-500 kcal ek enerji gerekli. Planında buna göre düzenleme yapacağız.',
  },
  protein_over_amdr: {
    tone: 'warning',
    emoji: '⚠️',
    title: 'Protein hedef sınırında',
    body: "Seçimlerin protein için AMDR üst sınırı %35'i geçiyor. Bu biyolojik olarak güvenli ama uzun vadede dengeyi gözetmek gerekir.",
  },
  calorie_floor_hit: {
    tone: 'warning',
    emoji: '⚠️',
    title: 'Minimum kalori eşiği',
    body: 'Hedefin güvenli minimumun altına düştü. Kadın için 1200, erkek için 1500 kcal sınırında koruduk.',
  },
};
