import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, BorderRadius, FontSize } from '../../lib/constants';
import { WeightLog, BodyMeasurement } from '../../types';
import { calculateBMI, getBMICategory, calculateMacroGoals, AMDR, UserMetrics } from '../../lib/nutrition';
import { analyzeWeeklyNutrition } from '../../lib/gemini';
import { WeightSpiral } from '../../components/charts/WeightSpiral';
import { KcalStrip } from '../../components/charts/KcalStrip';
import { HabitGarden } from '../../components/charts/HabitGarden';
import { AchievementConstellation } from '../../components/charts/AchievementConstellation';

const screenWidth = Dimensions.get('window').width;

interface Badge {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
}

function computeBadges(params: {
  weightLogs: WeightLog[];
  foodLogCount: number;
  chatMessageCount: number;
  weightChange: number;
}): Badge[] {
  const { weightLogs, foodLogCount, chatMessageCount, weightChange } = params;
  return [
    { id: 'first_step', icon: '🌱', title: 'İlk Adım', description: 'İlk kilo ölçümünü kaydettin', unlocked: weightLogs.length >= 1 },
    { id: 'consistent', icon: '📅', title: 'Tutarlı', description: '7 veya daha fazla yemek kaydı', unlocked: foodLogCount >= 7 },
    { id: 'dedicated', icon: '🔥', title: 'Kararlı', description: '30 veya daha fazla yemek kaydı', unlocked: foodLogCount >= 30 },
    { id: 'ai_friend', icon: '🤖', title: 'AI Dostu', description: 'FitBot ile 10+ mesajlaştın', unlocked: chatMessageCount >= 10 },
    { id: 'weight_tracker', icon: '📊', title: 'Takipçi', description: '5 veya daha fazla kilo ölçümü', unlocked: weightLogs.length >= 5 },
    { id: 'minus_2', icon: '🏅', title: '-2 Kilo', description: 'Başlangıçtan 2 kg verdin', unlocked: weightChange <= -2 },
    { id: 'minus_5', icon: '🏆', title: '-5 Kilo', description: 'Başlangıçtan 5 kg verdin', unlocked: weightChange <= -5 },
    { id: 'explorer', icon: '🔬', title: 'Kaşif', description: '20 veya daha fazla farklı yemek', unlocked: foodLogCount >= 20 },
  ];
}

type ProgressView = 'spiral' | 'garden' | 'constellation';

export default function ProgressScreen() {
  const { user, profile } = useAuthStore();

  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [progressView, setProgressView] = useState<ProgressView>('spiral');

  const [trendData, setTrendData] = useState<{ date: string; calories: number; protein: number; carbs: number; fat: number }[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [showMeasureModal, setShowMeasureModal] = useState(false);
  const [measureInput, setMeasureInput] = useState({ waist: '', hip: '', chest: '', arm: '' });

  const [foodLogCount, setFoodLogCount] = useState(0);
  const [chatMessageCount, setChatMessageCount] = useState(0);

  const [weeklyAnalysis, setWeeklyAnalysis] = useState('');
  const [analyzingWeekly, setAnalyzingWeekly] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  useEffect(() => { fetchAll(); }, [user]);

  async function fetchAll() {
    if (!user) return;
    await Promise.all([fetchWeightLogs(), fetchMeasurements(), fetchCounts(), fetchTrendData()]);
  }

  async function fetchTrendData() {
    if (!user) return;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const { data } = await supabase
      .from('food_logs').select('calories, protein, carbs, fat, logged_at')
      .eq('user_id', user.id).gte('logged_at', thirtyDaysAgo.toISOString())
      .order('logged_at', { ascending: true });

    const grouped: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      grouped[d.toISOString().split('T')[0]] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
    for (const log of data ?? []) {
      const dateKey = log.logged_at.split('T')[0];
      if (grouped[dateKey]) {
        grouped[dateKey].calories += log.calories;
        grouped[dateKey].protein += log.protein;
        grouped[dateKey].carbs += log.carbs;
        grouped[dateKey].fat += log.fat;
      }
    }
    setTrendData(Object.entries(grouped).map(([date, v]) => ({ date, ...v })));
  }

  async function fetchWeightLogs() {
    if (!user) return;
    const { data } = await supabase.from('weight_logs').select('*').eq('user_id', user.id)
      .order('logged_at', { ascending: true }).limit(90);
    setWeightLogs(data ?? []);
  }

  async function fetchMeasurements() {
    if (!user) return;
    const { data } = await supabase.from('body_measurements').select('*').eq('user_id', user.id)
      .order('logged_at', { ascending: false }).limit(10);
    setMeasurements(data ?? []);
  }

  async function fetchCounts() {
    if (!user) return;
    const [foodRes, chatRes] = await Promise.all([
      supabase.from('food_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('role', 'user'),
    ]);
    setFoodLogCount(foodRes.count ?? 0);
    setChatMessageCount(chatRes.count ?? 0);
  }

  async function addWeightLog() {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight < 20 || weight > 300) {
      Alert.alert('Hata', 'Geçerli bir kilo değeri girin (20-300 kg)');
      return;
    }
    if (!user) return;
    await supabase.from('weight_logs').insert({ user_id: user.id, weight_kg: weight, logged_at: new Date().toISOString() });
    setNewWeight('');
    await fetchWeightLogs();
  }

  async function addMeasurement() {
    const waist = parseFloat(measureInput.waist) || null;
    const hip = parseFloat(measureInput.hip) || null;
    const chest = parseFloat(measureInput.chest) || null;
    const arm = parseFloat(measureInput.arm) || null;
    if (!waist && !hip && !chest && !arm) { Alert.alert('Hata', 'En az bir ölçüm değeri girin'); return; }
    if (!user) return;
    await supabase.from('body_measurements').insert({ user_id: user.id, waist_cm: waist, hip_cm: hip, chest_cm: chest, arm_cm: arm, logged_at: new Date().toISOString() });
    setMeasureInput({ waist: '', hip: '', chest: '', arm: '' });
    setShowMeasureModal(false);
    await fetchMeasurements();
  }

  async function handleWeeklyAnalysis() {
    if (!profile || !user) return;
    setAnalyzingWeekly(true);
    setShowAnalysisModal(true);
    try {
      const days: { date: string; calories: number; protein: number; carbs: number; fat: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const { data } = await supabase.from('food_logs').select('calories, protein, carbs, fat')
          .eq('user_id', user.id).gte('logged_at', `${dateStr}T00:00:00`).lte('logged_at', `${dateStr}T23:59:59`);
        const logs = data ?? [];
        days.push({
          date: d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }),
          calories: Math.round(logs.reduce((s, l) => s + l.calories, 0)),
          protein: Math.round(logs.reduce((s, l) => s + l.protein, 0)),
          carbs: Math.round(logs.reduce((s, l) => s + l.carbs, 0)),
          fat: Math.round(logs.reduce((s, l) => s + l.fat, 0)),
        });
      }
      const age = new Date().getFullYear() - new Date(profile.birth_date).getFullYear();
      const metrics: UserMetrics = { gender: profile.gender, age, height_cm: profile.height_cm, weight_kg: profile.weight_kg, activity_level: profile.activity_level, goal: profile.goal };
      const goals = calculateMacroGoals(metrics);
      const analysis = await analyzeWeeklyNutrition({ profile, dailyData: days, goals });
      setWeeklyAnalysis(analysis);
    } catch {
      setWeeklyAnalysis('Analiz alınırken bir hata oluştu.');
    } finally {
      setAnalyzingWeekly(false);
    }
  }

  // Derived values
  const currentWeight = weightLogs[weightLogs.length - 1]?.weight_kg ?? profile?.weight_kg;
  const startWeight = weightLogs[0]?.weight_kg ?? profile?.weight_kg;
  const weightChange = currentWeight && startWeight ? currentWeight - startWeight : 0;
  const bmi = currentWeight && profile?.height_cm ? calculateBMI(currentWeight, profile.height_cm) : null;
  const badges = computeBadges({ weightLogs, foodLogCount, chatMessageCount, weightChange });
  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const latestMeasure = measurements[0];
  const targetWeight = profile?.target_weight_kg ?? 70;

  // Build spiral data from real weight logs
  const spiralData = React.useMemo(() => {
    if (weightLogs.length >= 2) {
      return weightLogs.map((l, i) => ({ week: i, weight: l.weight_kg }));
    }
    // Synthetic if not enough data
    if (profile?.weight_kg) {
      const weeks = 12;
      return Array.from({ length: weeks }, (_, i) => ({
        week: i,
        weight: +(profile.weight_kg - (profile.weight_kg - targetWeight) * (i / (weeks - 1)) + Math.sin(i * 0.9) * 0.3).toFixed(1),
      }));
    }
    return [];
  }, [weightLogs, profile?.weight_kg, targetWeight]);

  // KcalStrip data (30-day)
  const kcalData = trendData.map((d) => Math.round(d.calories));

  // Badge stars for constellation
  const constellationStars = [
    { x: 50, y: 70, name: 'İlk Adım', unlocked: badges[0].unlocked, big: true },
    { x: 140, y: 50, name: 'Tutarlı', unlocked: badges[1].unlocked },
    { x: 230, y: 100, name: 'Kararlı', unlocked: badges[2].unlocked },
    { x: 280, y: 180, name: '-2 Kilo', unlocked: badges[5].unlocked, big: true },
    { x: 190, y: 220, name: 'AI Dostu', unlocked: badges[3].unlocked },
    { x: 90, y: 200, name: 'Takipçi', unlocked: badges[4].unlocked },
    { x: 60, y: 260, name: '-5 Kilo', unlocked: badges[6].unlocked },
    { x: 240, y: 270, name: 'Kaşif', unlocked: badges[7].unlocked },
  ];
  const constellationEdges: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[4,5],[0,5]];

  // Habit garden (based on available data proxies)
  const gardenHabits = [
    { name: 'Yemek', streak: Math.min(14, Math.ceil(foodLogCount / 5)) },
    { name: 'Kilo', streak: Math.min(14, weightLogs.length) },
    { name: 'FitBot', streak: Math.min(14, Math.ceil(chatMessageCount / 3)) },
    { name: 'Rozet', streak: Math.min(14, unlockedCount * 2) },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.overline}>52 HAFTA · BİR YIL</Text>
          <Text style={styles.heading}>
            {'Spiralin '}
            <Text style={styles.headingAccent}>içe doğru</Text>
            {' dönüyor.'}
          </Text>
        </View>

        {/* ── STAT BAR ── */}
        <View style={styles.statBar}>
          {[
            { label: 'BAŞLANGIÇ', val: startWeight ? `${startWeight.toFixed(1)} kg` : '—', c: Colors.ink3 },
            { label: 'ŞİMDİ', val: currentWeight ? `${currentWeight.toFixed(1)} kg` : '—', c: Colors.ink },
            { label: 'DEĞİŞİM', val: currentWeight && startWeight ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg` : '—', c: weightChange < 0 ? Colors.primary : Colors.terracotta },
            { label: 'HEDEFE', val: currentWeight ? `${(currentWeight - targetWeight).toFixed(1)} kg` : '—', c: Colors.ink2 },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={[styles.statValue, { color: s.c }]}>{s.val}</Text>
            </View>
          ))}
        </View>

        {/* ── VIEW TOGGLE ── */}
        <View style={styles.viewToggle}>
          {([
            { k: 'spiral' as ProgressView, label: 'Spiral', icon: '❋' },
            { k: 'garden' as ProgressView, label: 'Bahçe', icon: '❦' },
            { k: 'constellation' as ProgressView, label: 'Takımyıldız', icon: '✦' },
          ]).map((t) => (
            <TouchableOpacity
              key={t.k}
              style={[styles.toggleBtn, progressView === t.k && styles.toggleBtnActive]}
              onPress={() => setProgressView(t.k)}
            >
              <Text style={[styles.toggleText, progressView === t.k && styles.toggleTextActive]}>
                {t.icon}{'  '}{t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── MAIN VISUAL ── */}
        <View style={styles.visualWrap}>
          {progressView === 'spiral' && spiralData.length >= 2 && (
            <WeightSpiral data={spiralData} target={targetWeight} size={screenWidth - 44} />
          )}
          {progressView === 'spiral' && spiralData.length < 2 && (
            <View style={styles.emptyVisual}>
              <Text style={styles.emptyIcon}>❋</Text>
              <Text style={styles.emptyText}>Spiral için en az 2 kilo ölçümü gerekli</Text>
            </View>
          )}
          {progressView === 'garden' && (
            <HabitGarden habits={gardenHabits} width={screenWidth - 44} height={300} />
          )}
          {progressView === 'constellation' && (
            <AchievementConstellation
              stars={constellationStars}
              edges={constellationEdges}
              width={screenWidth - 44}
              height={310}
            />
          )}
        </View>

        {/* ── CAPTION ── */}
        <View style={styles.caption}>
          {progressView === 'spiral' && (
            <Text style={styles.captionText}>
              Her turaç bir hafta. Merkezden dışarı saydığında bugüne varırsın.{'\n'}
              <Text style={styles.captionMono}>KOYU = DAHA HAFİF · AÇIK = DAHA AĞIR</Text>
            </Text>
          )}
          {progressView === 'garden' && (
            <Text style={styles.captionText}>Her alışkanlığın bir fidan. Tutarlılık büyütür, es geçme kurutur.</Text>
          )}
          {progressView === 'constellation' && (
            <Text style={styles.captionText}>
              {unlockedCount}/{badges.length} rozetten {unlockedCount}'si kazanıldı. Çizgiler yıldızlar arasındaki yolculuğunu gösterir.
            </Text>
          )}
        </View>

        {/* ── KCAL 30-GÜN ── */}
        {kcalData.some((v) => v > 0) && (
          <View style={styles.kcalCard}>
            <View style={styles.kcalHeader}>
              <Text style={styles.cardTitle}>Günlük kalori — 30 gün</Text>
              <Text style={styles.overlineSm}>HEDEF {profile?.daily_calorie_goal ?? 2000}</Text>
            </View>
            <KcalStrip data={kcalData} goal={profile?.daily_calorie_goal ?? 2000} width={screenWidth - 88} height={60} />
          </View>
        )}

        {/* ── KILO EKLE ── */}
        <View style={styles.section}>
          <Text style={styles.overline}>KİLO KAYDET</Text>
          <View style={styles.weightRow}>
            <TextInput
              style={styles.weightInput}
              value={newWeight}
              onChangeText={setNewWeight}
              placeholder="kg"
              keyboardType="numeric"
              placeholderTextColor={Colors.ink4}
            />
            <TouchableOpacity style={styles.weightSaveBtn} onPress={addWeightLog}>
              <Text style={styles.weightSaveBtnText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
          {weightLogs.slice(-3).reverse().map((log, i) => (
            <View key={log.id} style={[styles.logRow, i > 0 && styles.logRowBorder]}>
              <Text style={styles.logDate}>
                {new Date(log.logged_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
              </Text>
              <Text style={styles.logWeight}>{log.weight_kg} kg</Text>
            </View>
          ))}
          {weightLogs.length === 0 && (
            <Text style={styles.emptySmall}>Henüz kilo ölçümü yok</Text>
          )}
        </View>

        {/* ── AMDR MAKRO ── */}
        {profile?.daily_calorie_goal != null && profile.daily_calorie_goal > 0 && (() => {
          const totalCal = profile.daily_calorie_goal;
          const macros = [
            { label: 'Protein', grams: profile.daily_protein_goal ?? 0, pct: ((profile.daily_protein_goal ?? 0) * 4) / totalCal, min: AMDR.protein.min, max: AMDR.protein.max, barMax: 0.42, color: Colors.protein },
            { label: 'Karbonhidrat', grams: profile.daily_carbs_goal ?? 0, pct: ((profile.daily_carbs_goal ?? 0) * 4) / totalCal, min: AMDR.carbs.min, max: AMDR.carbs.max, barMax: 0.72, color: Colors.carbs },
            { label: 'Yağ', grams: profile.daily_fat_goal ?? 0, pct: ((profile.daily_fat_goal ?? 0) * 9) / totalCal, min: AMDR.fat.min, max: AMDR.fat.max, barMax: 0.42, color: Colors.fat },
          ];
          return (
            <View style={styles.section}>
              <Text style={styles.overline}>MAKRO AMDR</Text>
              {macros.map(({ label, grams, pct, min, max, barMax, color }) => {
                const inRange = pct >= min && pct <= max;
                return (
                  <View key={label} style={styles.amdrItem}>
                    <View style={styles.amdrRow}>
                      <Text style={styles.amdrLabel}>{label}</Text>
                      <Text style={[styles.amdrPct, { color: inRange ? Colors.primary : Colors.terracotta }]}>
                        {inRange ? '✓' : '⚠'} {Math.round(pct * 100)}%
                      </Text>
                      <Text style={styles.amdrGrams}>{grams}g</Text>
                    </View>
                    <View style={styles.amdrBg}>
                      <View style={[styles.amdrFill, { width: `${Math.min((pct / barMax) * 100, 100)}%` as any, backgroundColor: inRange ? color : Colors.ochre }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })()}

        {/* ── VÜCUT ÖLÇÜLERİ ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.overline}>VÜCUT ÖLÇÜLERİ</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowMeasureModal(true)}>
              <Text style={styles.addBtnText}>+ Ekle</Text>
            </TouchableOpacity>
          </View>
          {latestMeasure ? (
            <View style={styles.measureGrid}>
              {latestMeasure.waist_cm && <MeasureItem value={latestMeasure.waist_cm} label="Bel" unit="cm" />}
              {latestMeasure.hip_cm && <MeasureItem value={latestMeasure.hip_cm} label="Kalça" unit="cm" />}
              {latestMeasure.chest_cm && <MeasureItem value={latestMeasure.chest_cm} label="Göğüs" unit="cm" />}
              {latestMeasure.arm_cm && <MeasureItem value={latestMeasure.arm_cm} label="Kol" unit="cm" />}
            </View>
          ) : (
            <Text style={styles.emptySmall}>Henüz vücut ölçümü yok</Text>
          )}
        </View>

        {/* ── AI ANALİZ KARTI (dark) ── */}
        <View style={styles.aiCard}>
          <Text style={styles.aiOverline}>HAFTALIK AI ANALİZİ</Text>
          <Text style={styles.aiTitle}>FitBot son 7 günü{'\n'}değerlendirsin.</Text>
          <View style={styles.aiDivider} />
          <TouchableOpacity style={styles.aiButton} onPress={handleWeeklyAnalysis}>
            <Text style={styles.aiButtonText}>FitBot ile konuş →</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Vücut Ölçüsü Modal */}
      <Modal visible={showMeasureModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vücut Ölçüsü Ekle</Text>
              <TouchableOpacity onPress={() => setShowMeasureModal(false)}>
                <Ionicons name="close" size={24} color={Colors.ink2} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>Cm cinsinden girin (boş bırakabilirsiniz)</Text>
            {[
              { key: 'waist', label: 'Bel çevresi' },
              { key: 'hip', label: 'Kalça çevresi' },
              { key: 'chest', label: 'Göğüs çevresi' },
              { key: 'arm', label: 'Üst kol çevresi' },
            ].map(({ key, label }) => (
              <View key={key} style={styles.measureInputRow}>
                <Text style={styles.measureInputLabel}>{label}</Text>
                <TextInput
                  style={styles.measureInput}
                  value={measureInput[key as keyof typeof measureInput]}
                  onChangeText={(v) => setMeasureInput((prev) => ({ ...prev, [key]: v }))}
                  placeholder="—"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.ink4}
                />
                <Text style={styles.measureUnit}>cm</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.modalSaveBtn} onPress={addMeasurement}>
              <Text style={styles.modalSaveBtnText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Haftalık Analiz Modal */}
      <Modal visible={showAnalysisModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Haftalık Analiz</Text>
              <TouchableOpacity onPress={() => { setShowAnalysisModal(false); setWeeklyAnalysis(''); }}>
                <Ionicons name="close" size={24} color={Colors.ink2} />
              </TouchableOpacity>
            </View>
            {analyzingWeekly ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>FitBot analiz ediyor…</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.analysisText}>{weeklyAnalysis}</Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MeasureItem({ value, label, unit }: { value: number; label: string; unit: string }) {
  return (
    <View style={styles.measureItem}>
      <Text style={styles.measureValue}>{value}</Text>
      <Text style={styles.measureUnit2}>{unit}</Text>
      <Text style={styles.measureLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 14 },
  overline: { fontSize: 10, color: Colors.ink3, letterSpacing: 1.8, fontFamily: 'Menlo, Courier, monospace', textTransform: 'uppercase' },
  overlineSm: { fontSize: 9, color: Colors.ink3, letterSpacing: 1, fontFamily: 'Menlo, Courier, monospace' },
  heading: { fontSize: 34, lineHeight: 38, color: Colors.ink, fontFamily: 'Georgia, serif', marginTop: 4 },
  headingAccent: { color: Colors.terracotta, fontStyle: 'italic', fontFamily: 'Georgia, serif' },

  // Stat bar
  statBar: {
    marginHorizontal: 22, marginBottom: 12,
    padding: 14, backgroundColor: Colors.surface,
    borderWidth: 0.5, borderColor: Colors.line, borderRadius: BorderRadius.md,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 8, color: Colors.ink3, letterSpacing: 1.4, fontFamily: 'Menlo, Courier, monospace' },
  statValue: { fontSize: 18, color: Colors.ink, fontFamily: 'Georgia, serif', marginTop: 2 },

  // View toggle
  viewToggle: { flexDirection: 'row', paddingHorizontal: 22, gap: 6, marginBottom: 10 },
  toggleBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 0.5, borderColor: Colors.line,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: Colors.ink, borderWidth: 0 },
  toggleText: { fontSize: 12, color: Colors.ink2, fontFamily: 'Georgia, serif' },
  toggleTextActive: { color: Colors.background },

  // Visual
  visualWrap: { paddingHorizontal: 22, paddingVertical: 10, alignItems: 'center' },
  emptyVisual: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 13, color: Colors.ink3, textAlign: 'center' },

  // Caption
  caption: { paddingHorizontal: 22, paddingBottom: 14, alignItems: 'center' },
  captionText: { fontSize: 12, color: Colors.ink2, lineHeight: 18, textAlign: 'center', maxWidth: 310 },
  captionMono: { fontSize: 10, color: Colors.ink3, fontFamily: 'Menlo, Courier, monospace', letterSpacing: 1 },

  // KcalStrip card
  kcalCard: {
    marginHorizontal: 22, marginBottom: 20,
    padding: 16, backgroundColor: Colors.surface,
    borderWidth: 0.5, borderColor: Colors.line, borderRadius: BorderRadius.md,
  },
  kcalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  cardTitle: { fontSize: 17, color: Colors.ink, fontFamily: 'Georgia, serif' },

  // Sections
  section: { paddingHorizontal: 22, marginBottom: 22 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },

  // Weight input
  weightRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 14 },
  weightInput: {
    flex: 1, borderWidth: 0.5, borderColor: Colors.line, borderRadius: BorderRadius.md,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, color: Colors.ink,
    backgroundColor: Colors.surface,
  },
  weightSaveBtn: { backgroundColor: Colors.ink, paddingHorizontal: 20, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  weightSaveBtnText: { color: Colors.background, fontWeight: '600', fontSize: 15 },

  logRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  logRowBorder: { borderTopWidth: 0.5, borderTopColor: Colors.line2 },
  logDate: { fontSize: 14, color: Colors.ink2 },
  logWeight: { fontSize: 14, fontWeight: '700', color: Colors.ink, fontFamily: 'Georgia, serif' },

  // AMDR
  amdrItem: { marginBottom: 14 },
  amdrRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  amdrLabel: { flex: 1, fontSize: 14, color: Colors.ink },
  amdrPct: { fontSize: 11, fontWeight: '700' },
  amdrGrams: { fontSize: 12, color: Colors.ink3, fontFamily: 'Menlo, Courier, monospace' },
  amdrBg: { height: 6, backgroundColor: Colors.line, borderRadius: BorderRadius.full, overflow: 'hidden' },
  amdrFill: { height: 6, borderRadius: BorderRadius.full },

  // Add button
  addBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 0.5, borderColor: Colors.line },
  addBtnText: { fontSize: 12, color: Colors.ink2 },

  emptySmall: { fontSize: 13, color: Colors.ink4, textAlign: 'center', paddingVertical: 12 },

  // Measure grid
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  measureItem: { flex: 1, minWidth: '45%', backgroundColor: Colors.surface, borderRadius: BorderRadius.sm, borderWidth: 0.5, borderColor: Colors.line, padding: 14, alignItems: 'center' },
  measureValue: { fontSize: 22, fontFamily: 'Georgia, serif', color: Colors.primary },
  measureUnit2: { fontSize: 11, color: Colors.ink3, marginTop: -2 },
  measureLabel: { fontSize: 11, color: Colors.ink3, marginTop: 4 },

  // AI dark card
  aiCard: {
    marginHorizontal: 22, marginBottom: 22,
    padding: 18, backgroundColor: Colors.ink, borderRadius: BorderRadius.md,
  },
  aiOverline: { fontSize: 10, letterSpacing: 1.6, color: Colors.background, opacity: 0.6, fontFamily: 'Menlo, Courier, monospace' },
  aiTitle: { fontSize: 22, lineHeight: 28, color: Colors.background, fontFamily: 'Georgia, serif', marginTop: 4 },
  aiDivider: { height: 1, backgroundColor: 'rgba(242,239,230,0.2)', marginVertical: 12 },
  aiButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(242,239,230,0.3)', alignSelf: 'flex-end' },
  aiButtonText: { fontSize: 12, color: Colors.background },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  modalTitle: { fontSize: 22, color: Colors.ink, fontFamily: 'Georgia, serif' },
  modalHint: { fontSize: 13, color: Colors.ink3, marginBottom: Spacing.md },
  measureInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, gap: Spacing.sm },
  measureInputLabel: { flex: 1, fontSize: 14, color: Colors.ink2 },
  measureInput: { width: 80, borderWidth: 0.5, borderColor: Colors.line, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 8, fontSize: 16, color: Colors.ink, textAlign: 'center' },
  measureUnit: { fontSize: 12, color: Colors.ink3 },
  modalSaveBtn: { backgroundColor: Colors.ink, paddingVertical: 14, borderRadius: BorderRadius.full, alignItems: 'center', marginTop: Spacing.md },
  modalSaveBtnText: { color: Colors.background, fontWeight: '600', fontSize: 16 },

  loadingWrap: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { color: Colors.ink3, fontSize: 14, marginTop: 12 },
  analysisText: { fontSize: 14, color: Colors.ink, lineHeight: 22 },
});
