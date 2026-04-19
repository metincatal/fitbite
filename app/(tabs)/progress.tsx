import React, { useEffect, useState, useCallback } from 'react';
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
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../lib/constants';
import { WeightLog, BodyMeasurement } from '../../types';
import { Card } from '../../components/ui/Card';
import { calculateBMI, getBMICategory, calculateDailyCalorieGoal, calculateMacroGoals, AMDR, UserMetrics } from '../../lib/nutrition';
import { analyzeWeeklyNutrition } from '../../lib/gemini';

const screenWidth = Dimensions.get('window').width;

// --- Rozet tanımları ---
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
    {
      id: 'first_step',
      icon: '🌱',
      title: 'İlk Adım',
      description: 'İlk kilo ölçümünü kaydettin',
      unlocked: weightLogs.length >= 1,
    },
    {
      id: 'consistent',
      icon: '📅',
      title: 'Tutarlı',
      description: '7 veya daha fazla yemek kaydı',
      unlocked: foodLogCount >= 7,
    },
    {
      id: 'dedicated',
      icon: '🔥',
      title: 'Kararlı',
      description: '30 veya daha fazla yemek kaydı',
      unlocked: foodLogCount >= 30,
    },
    {
      id: 'ai_friend',
      icon: '🤖',
      title: 'AI Dostu',
      description: 'FitBot ile 10+ mesajlaştın',
      unlocked: chatMessageCount >= 10,
    },
    {
      id: 'weight_tracker',
      icon: '📊',
      title: 'Takipçi',
      description: '5 veya daha fazla kilo ölçümü',
      unlocked: weightLogs.length >= 5,
    },
    {
      id: 'minus_2',
      icon: '🏅',
      title: '-2 Kilo',
      description: 'Başlangıçtan 2 kg verdin',
      unlocked: weightChange <= -2,
    },
    {
      id: 'minus_5',
      icon: '🏆',
      title: '-5 Kilo',
      description: 'Başlangıçtan 5 kg verdin',
      unlocked: weightChange <= -5,
    },
    {
      id: 'explorer',
      icon: '🔬',
      title: 'Kaşif',
      description: '20 veya daha fazla farklı yemek',
      unlocked: foodLogCount >= 20,
    },
  ];
}

export default function ProgressScreen() {
  const { user, profile } = useAuthStore();

  // Kilo takibi
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [activeTab, setActiveTab] = useState<'week' | 'month' | 'all'>('month');

  // Kalori & makro trend
  const [trendData, setTrendData] = useState<{ date: string; calories: number; protein: number; carbs: number; fat: number }[]>([]);
  const [trendTab, setTrendTab] = useState<'7' | '30'>('7');

  // Vücut ölçüleri
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [showMeasureModal, setShowMeasureModal] = useState(false);
  const [measureInput, setMeasureInput] = useState({ waist: '', hip: '', chest: '', arm: '' });

  // Rozetler
  const [foodLogCount, setFoodLogCount] = useState(0);
  const [chatMessageCount, setChatMessageCount] = useState(0);

  // Haftalık analiz
  const [weeklyAnalysis, setWeeklyAnalysis] = useState('');
  const [analyzingWeekly, setAnalyzingWeekly] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [user]);

  async function fetchAll() {
    if (!user) return;
    await Promise.all([
      fetchWeightLogs(),
      fetchMeasurements(),
      fetchCounts(),
      fetchTrendData(),
    ]);
  }

  async function fetchTrendData() {
    if (!user) return;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const { data } = await supabase
      .from('food_logs')
      .select('calories, protein, carbs, fat, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', thirtyDaysAgo.toISOString())
      .order('logged_at', { ascending: true });

    // Son 30 günü oluştur (veri olmayan günler sıfır olarak kalır)
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
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: true })
      .limit(90);
    setWeightLogs(data ?? []);
  }

  async function fetchMeasurements() {
    if (!user) return;
    const { data } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(10);
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
    await supabase.from('weight_logs').insert({
      user_id: user.id,
      weight_kg: weight,
      logged_at: new Date().toISOString(),
    });
    setNewWeight('');
    await fetchWeightLogs();
  }

  async function addMeasurement() {
    const waist = parseFloat(measureInput.waist) || null;
    const hip = parseFloat(measureInput.hip) || null;
    const chest = parseFloat(measureInput.chest) || null;
    const arm = parseFloat(measureInput.arm) || null;
    if (!waist && !hip && !chest && !arm) {
      Alert.alert('Hata', 'En az bir ölçüm değeri girin');
      return;
    }
    if (!user) return;
    await supabase.from('body_measurements').insert({
      user_id: user.id,
      waist_cm: waist,
      hip_cm: hip,
      chest_cm: chest,
      arm_cm: arm,
      logged_at: new Date().toISOString(),
    });
    setMeasureInput({ waist: '', hip: '', chest: '', arm: '' });
    setShowMeasureModal(false);
    await fetchMeasurements();
  }

  async function handleWeeklyAnalysis() {
    if (!profile || !user) return;
    setAnalyzingWeekly(true);
    setShowAnalysisModal(true);
    try {
      // Son 7 günün verilerini Supabase'den topla
      const days: { date: string; calories: number; protein: number; carbs: number; fat: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const { data } = await supabase
          .from('food_logs')
          .select('calories, protein, carbs, fat')
          .eq('user_id', user.id)
          .gte('logged_at', `${dateStr}T00:00:00`)
          .lte('logged_at', `${dateStr}T23:59:59`);
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
      const metrics: UserMetrics = {
        gender: profile.gender,
        age,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        activity_level: profile.activity_level,
        goal: profile.goal,
      };
      const goals = calculateMacroGoals(metrics);

      const analysis = await analyzeWeeklyNutrition({ profile, dailyData: days, goals });
      setWeeklyAnalysis(analysis);
    } catch (error) {
      console.error('Haftalık analiz hatası:', error);
      setWeeklyAnalysis('Analiz alınırken bir hata oluştu. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setAnalyzingWeekly(false);
    }
  }

  // Grafik hesaplamaları
  const filteredLogs = weightLogs.slice(
    activeTab === 'week' ? -7 : activeTab === 'month' ? -30 : 0
  );

  const chartLabels = filteredLogs
    .filter((_, i) => filteredLogs.length <= 7 || i % Math.ceil(filteredLogs.length / 7) === 0)
    .map((l) => new Date(l.logged_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }));

  const chartData = {
    labels: chartLabels,
    datasets: [{
      data: filteredLogs.length > 0
        ? filteredLogs.map((l) => l.weight_kg)
        : [profile?.weight_kg ?? 70],
    }],
  };

  const currentWeight = weightLogs[weightLogs.length - 1]?.weight_kg ?? profile?.weight_kg;
  const bmi = currentWeight && profile?.height_cm ? calculateBMI(currentWeight, profile.height_cm) : null;
  const startWeight = weightLogs[0]?.weight_kg ?? profile?.weight_kg;
  const weightChange = currentWeight && startWeight ? currentWeight - startWeight : 0;

  const badges = computeBadges({ weightLogs, foodLogCount, chatMessageCount, weightChange });
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const latestMeasure = measurements[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>İlerleme</Text>

        {/* Özet Kartlar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="scale-outline" size={22} color={Colors.textMuted} style={styles.statIcon} />
            <Text style={styles.statValue}>{currentWeight?.toFixed(1) ?? '—'} kg</Text>
            <Text style={styles.statLabel}>Güncel Kilo</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons
              name={weightChange <= 0 ? 'trending-down' : 'trending-up'}
              size={22}
              color={weightChange <= 0 ? Colors.success : Colors.error}
              style={styles.statIcon}
            />
            <Text style={[styles.statValue, { color: weightChange <= 0 ? Colors.success : Colors.error }]}>
              {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
            </Text>
            <Text style={styles.statLabel}>Değişim</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="bar-chart-outline" size={22} color={Colors.textMuted} style={styles.statIcon} />
            <Text style={styles.statValue}>{bmi ?? '—'}</Text>
            <Text style={styles.statLabel}>BMI {bmi ? `(${getBMICategory(bmi)})` : ''}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="ribbon-outline" size={22} color={Colors.textMuted} style={styles.statIcon} />
            <Text style={styles.statValue}>{unlockedCount}/{badges.length}</Text>
            <Text style={styles.statLabel}>Rozet</Text>
          </Card>
        </ScrollView>

        {/* Kilo Grafiği */}
        <Card style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Kilo Grafiği</Text>
          <View style={styles.tabRow}>
            {(['week', 'month', 'all'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'week' ? '7 Gün' : tab === 'month' ? '30 Gün' : 'Tümü'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {filteredLogs.length > 1 ? (
            <LineChart
              data={chartData}
              width={screenWidth - Spacing.lg * 2 - Spacing.md * 2}
              height={200}
              chartConfig={{
                backgroundColor: Colors.surface,
                backgroundGradientFrom: Colors.surface,
                backgroundGradientTo: Colors.surface,
                decimalPlaces: 1,
                color: () => Colors.primary,
                labelColor: () => Colors.textMuted,
                style: { borderRadius: BorderRadius.md },
                propsForDots: { r: '4', strokeWidth: '2', stroke: Colors.primary, fill: Colors.primaryPale },
              }}
              bezier
              style={{ borderRadius: BorderRadius.md }}
            />
          ) : (
            <View style={styles.noChartData}>
              <Text style={styles.noChartText}>Grafik için en az 2 ölçüm gerekli</Text>
            </View>
          )}
        </Card>

        {/* Kilo Ekle */}
        <Card style={styles.addWeightCard}>
          <Text style={styles.sectionTitle}>Kilo Ekle</Text>
          <View style={styles.addWeightRow}>
            <TextInput
              style={styles.weightInput}
              value={newWeight}
              onChangeText={setNewWeight}
              placeholder="Kilonuzu girin (kg)"
              keyboardType="numeric"
              placeholderTextColor={Colors.textMuted}
            />
            <TouchableOpacity style={styles.addWeightButton} onPress={addWeightLog}>
              <Text style={styles.addWeightButtonText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Son Ölçümler */}
        <Card style={styles.logsCard}>
          <Text style={styles.sectionTitle}>Son Kilo Ölçümleri</Text>
          {weightLogs.slice(-5).reverse().map((log, index) => (
            <View key={log.id} style={[styles.logRow, index > 0 && styles.logRowBorder]}>
              <Text style={styles.logDate}>
                {new Date(log.logged_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              <Text style={styles.logWeight}>{log.weight_kg} kg</Text>
            </View>
          ))}
          {weightLogs.length === 0 && <Text style={styles.noLogs}>Henüz kilo ölçümü yok</Text>}
        </Card>

        {/* Hedef Kilo Timeline */}
        {profile?.target_weight_kg && currentWeight && (
          (() => {
            const target = profile.target_weight_kg!;
            const weeklyRate = profile.weekly_weight_goal_kg ?? 0.5;
            const kgRemaining = Math.abs(currentWeight - target);
            const weeksRemaining = weeklyRate > 0 ? Math.ceil(kgRemaining / weeklyRate) : null;
            const isLosing = currentWeight > target;
            const progressDenominator = startWeight ? Math.abs(startWeight - target) : 0;
            const progressPct = progressDenominator > 0
              ? Math.max(0, Math.min(100, Math.abs((startWeight! - currentWeight) / (startWeight! - target)) * 100))
              : 0;
            const reached = kgRemaining < 0.5;
            void isLosing;

            return (
              <Card style={styles.chartCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Hedef Kilo Takibi</Text>
                  <Ionicons name="flag-outline" size={20} color={Colors.primary} />
                </View>

                <View style={styles.targetRow}>
                  <View style={styles.targetStat}>
                    <Text style={styles.targetStatValue}>{currentWeight.toFixed(1)} kg</Text>
                    <Text style={styles.targetStatLabel}>Şu an</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={Colors.textMuted} />
                  <View style={styles.targetStat}>
                    <Text style={[styles.targetStatValue, { color: Colors.primary }]}>{target.toFixed(1)} kg</Text>
                    <Text style={styles.targetStatLabel}>Hedef</Text>
                  </View>
                </View>

                <View style={styles.targetBarBg}>
                  <View style={[styles.targetBarFill, { width: `${progressPct}%` as any }]} />
                </View>
                <Text style={styles.targetPct}>{Math.round(progressPct)}% tamamlandı</Text>

                {reached ? (
                  <Text style={styles.targetReached}>Hedefinize ulaştınız!</Text>
                ) : (
                  <Text style={styles.targetRemaining}>
                    {kgRemaining.toFixed(1)} kg kaldı
                    {weeksRemaining ? ` · yaklaşık ${weeksRemaining} hafta` : ''}
                  </Text>
                )}
              </Card>
            );
          })()
        )}

        {/* Kalori & Makro Trend */}
        {(() => {
          const sliced = trendTab === '7' ? trendData.slice(-7) : trendData;
          const calorieData = sliced.map((d) => Math.round(d.calories));
          const proteinData = sliced.map((d) => Math.round(d.protein));
          const hasData = calorieData.some((c) => c > 0);

          const MONTH_SHORT = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
          const labels = sliced.map((d, i) => {
            const date = new Date(d.date);
            const day = date.getDate();
            const mon = date.getMonth();
            if (trendTab === '7') {
              return String(day);
            }
            // 30-gün: her 5'te bir göster, ay geçişini işaretle
            if (i % 5 !== 0) return '';
            const prevDate = i > 0 ? new Date(sliced[i - 5]?.date ?? d.date) : null;
            const monthChanged = prevDate && prevDate.getMonth() !== mon;
            if (day <= 5 || monthChanged) return MONTH_SHORT[mon];
            return String(day);
          });

          return (
            <Card style={styles.chartCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Kalori & Protein Trendi</Text>
              </View>
              <View style={styles.tabRow}>
                {(['7', '30'] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tab, trendTab === tab && styles.tabActive]}
                    onPress={() => setTrendTab(tab)}
                  >
                    <Text style={[styles.tabText, trendTab === tab && styles.tabTextActive]}>
                      {tab === '7' ? '7 Gün' : '30 Gün'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {hasData ? (
                <>
                  <Text style={styles.trendChartLabel}>Günlük Kalori (kcal)</Text>
                  <BarChart
                    data={{ labels, datasets: [{ data: calorieData }] }}
                    width={screenWidth - Spacing.lg * 2 - Spacing.md * 2}
                    height={160}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                      backgroundColor: Colors.surface,
                      backgroundGradientFrom: Colors.surface,
                      backgroundGradientTo: Colors.surface,
                      decimalPlaces: 0,
                      color: () => Colors.accent,
                      labelColor: () => Colors.textMuted,
                      barPercentage: trendTab === '7' ? 0.6 : 0.4,
                      propsForLabels: { fontSize: '10' },
                    }}
                    style={{ borderRadius: BorderRadius.md, marginLeft: -Spacing.md }}
                    withInnerLines={false}
                    showBarTops={false}
                    fromZero
                  />
                  <Text style={[styles.trendChartLabel, { marginTop: Spacing.sm }]}>Günlük Protein (g)</Text>
                  <LineChart
                    data={{ labels, datasets: [{ data: proteinData, color: () => Colors.protein }] }}
                    width={screenWidth - Spacing.lg * 2 - Spacing.md * 2}
                    height={160}
                    chartConfig={{
                      backgroundColor: Colors.surface,
                      backgroundGradientFrom: Colors.surface,
                      backgroundGradientTo: Colors.surface,
                      decimalPlaces: 0,
                      color: () => Colors.protein,
                      labelColor: () => Colors.textMuted,
                      propsForDots: { r: '3', strokeWidth: '1', stroke: Colors.protein, fill: Colors.protein },
                      propsForLabels: { fontSize: '10' },
                    }}
                    bezier
                    style={{ borderRadius: BorderRadius.md, marginLeft: -Spacing.md }}
                    withDots={trendTab === '7'}
                    withInnerLines={false}
                  />
                  {profile?.daily_calorie_goal && (
                    <Text style={styles.trendGoalText}>
                      Kalori hedefi: {profile.daily_calorie_goal} kcal/gün
                    </Text>
                  )}
                </>
              ) : (
                <View style={styles.noChartData}>
                  <Text style={styles.noChartText}>Yeterli veri yok — yemek kaydı ekleyin</Text>
                </View>
              )}
            </Card>
          );
        })()}

        {/* AMDR Makro Dağılım */}
        {profile?.daily_calorie_goal != null && profile.daily_calorie_goal > 0 && (() => {
          const totalCal = profile.daily_calorie_goal;
          const macros = [
            {
              label: 'Protein', emoji: '🥩',
              grams: profile.daily_protein_goal ?? 0,
              pct: ((profile.daily_protein_goal ?? 0) * 4) / totalCal,
              min: AMDR.protein.min, max: AMDR.protein.max, barMax: 0.42,
              inRangeColor: Colors.protein,
            },
            {
              label: 'Karbonhidrat', emoji: '🍞',
              grams: profile.daily_carbs_goal ?? 0,
              pct: ((profile.daily_carbs_goal ?? 0) * 4) / totalCal,
              min: AMDR.carbs.min, max: AMDR.carbs.max, barMax: 0.72,
              inRangeColor: Colors.carbs,
            },
            {
              label: 'Yağ', emoji: '🥑',
              grams: profile.daily_fat_goal ?? 0,
              pct: ((profile.daily_fat_goal ?? 0) * 9) / totalCal,
              min: AMDR.fat.min, max: AMDR.fat.max, barMax: 0.42,
              inRangeColor: Colors.fat,
            },
          ];
          return (
            <Card style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Makro Dağılım (AMDR)</Text>
              <Text style={styles.amdrSubtitle}>Günlük hedefinin WHO enerji aralıklarıyla uyumu</Text>
              {macros.map(({ label, emoji, grams, pct, min, max, barMax, inRangeColor }) => {
                const inRange = pct >= min && pct <= max;
                const fillW = `${Math.min((pct / barMax) * 100, 100)}%` as any;
                return (
                  <View key={label} style={styles.amdrItem}>
                    <View style={styles.amdrLabelRow}>
                      <Text style={styles.amdrEmoji}>{emoji}</Text>
                      <Text style={styles.amdrLabel}>{label}</Text>
                      <View style={[styles.amdrPctBadge, { backgroundColor: inRange ? Colors.primaryPale : '#FFF3CD' }]}>
                        <Text style={[styles.amdrPctText, { color: inRange ? Colors.primary : '#D97706' }]}>
                          {inRange ? '✓' : '⚠'} {Math.round(pct * 100)}%
                        </Text>
                      </View>
                      <Text style={styles.amdrGrams}>{grams}g</Text>
                    </View>
                    <View style={styles.amdrBarBg}>
                      <View style={[styles.amdrBarFill, { width: fillW, backgroundColor: inRange ? inRangeColor : '#F59E0B' }]} />
                    </View>
                    <Text style={styles.amdrRangeText}>Hedef aralık: %{Math.round(min * 100)}–%{Math.round(max * 100)}</Text>
                  </View>
                );
              })}
            </Card>
          );
        })()}

        {/* Vücut Ölçüleri */}
        <Card style={styles.measureCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vücut Ölçüleri</Text>
            <TouchableOpacity style={styles.addMeasureBtn} onPress={() => setShowMeasureModal(true)}>
              <Ionicons name="add" size={18} color={Colors.textLight} />
              <Text style={styles.addMeasureBtnText}>Ekle</Text>
            </TouchableOpacity>
          </View>
          {latestMeasure ? (
            <>
              <Text style={styles.measureDate}>
                Son ölçüm: {new Date(latestMeasure.logged_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
              </Text>
              <View style={styles.measureGrid}>
                {latestMeasure.waist_cm && (
                  <View style={styles.measureItem}>
                    <Text style={styles.measureValue}>{latestMeasure.waist_cm} cm</Text>
                    <Text style={styles.measureLabel}>Bel</Text>
                  </View>
                )}
                {latestMeasure.hip_cm && (
                  <View style={styles.measureItem}>
                    <Text style={styles.measureValue}>{latestMeasure.hip_cm} cm</Text>
                    <Text style={styles.measureLabel}>Kalça</Text>
                  </View>
                )}
                {latestMeasure.chest_cm && (
                  <View style={styles.measureItem}>
                    <Text style={styles.measureValue}>{latestMeasure.chest_cm} cm</Text>
                    <Text style={styles.measureLabel}>Göğüs</Text>
                  </View>
                )}
                {latestMeasure.arm_cm && (
                  <View style={styles.measureItem}>
                    <Text style={styles.measureValue}>{latestMeasure.arm_cm} cm</Text>
                    <Text style={styles.measureLabel}>Kol</Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            <Text style={styles.noLogs}>Henüz vücut ölçümü yok</Text>
          )}
        </Card>

        {/* Başarı Rozetleri */}
        <Card style={styles.badgesCard}>
          <Text style={styles.sectionTitle}>Başarı Rozetleri</Text>
          <Text style={styles.badgesSubtitle}>{unlockedCount} / {badges.length} rozet açıldı</Text>
          <View style={styles.badgesGrid}>
            {badges.map((badge) => (
              <View key={badge.id} style={[styles.badgeItem, !badge.unlocked && styles.badgeLocked]}>
                <Text style={[styles.badgeIcon, !badge.unlocked && styles.badgeIconLocked]}>
                  {badge.unlocked ? badge.icon : '🔒'}
                </Text>
                <Text style={[styles.badgeTitle, !badge.unlocked && styles.badgeTitleLocked]}>
                  {badge.title}
                </Text>
                <Text style={styles.badgeDesc}>{badge.description}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Haftalık AI Analizi */}
        <Card style={styles.analysisCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Haftalık AI Analizi</Text>
              <Text style={styles.analysisSubtitle}>FitBot son 7 günü değerlendirsin</Text>
            </View>
            <Ionicons name="sparkles" size={24} color={Colors.accent} />
          </View>
          <TouchableOpacity style={styles.analysisButton} onPress={handleWeeklyAnalysis}>
            <Ionicons name="analytics-outline" size={18} color={Colors.textLight} />
            <Text style={styles.analysisButtonText}>Analiz Al</Text>
          </TouchableOpacity>
        </Card>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Vücut Ölçüsü Modal */}
      <Modal visible={showMeasureModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vücut Ölçüsü Ekle</Text>
              <TouchableOpacity onPress={() => setShowMeasureModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>Cm cinsinden girin (doldurmak istemediğinizi boş bırakın)</Text>
            {[
              { key: 'waist', label: 'Bel çevresi' },
              { key: 'hip', label: 'Kalça çevresi' },
              { key: 'chest', label: 'Göğüs çevresi' },
              { key: 'arm', label: 'Üst kol çevresi' },
            ].map(({ key, label }) => (
              <View key={key} style={styles.measureInputRow}>
                <Text style={styles.measureInputLabel}>{label}</Text>
                <TextInput
                  style={styles.measureTextInput}
                  value={measureInput[key as keyof typeof measureInput]}
                  onChangeText={(v) => setMeasureInput((prev) => ({ ...prev, [key]: v }))}
                  placeholder="—"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textMuted}
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
          <View style={[styles.modalContent, styles.analysisModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Haftalık Analiz</Text>
              <TouchableOpacity onPress={() => { setShowAnalysisModal(false); setWeeklyAnalysis(''); }}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {analyzingWeekly ? (
              <View style={styles.analysisLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.analysisLoadingText}>FitBot beslenme verilerini analiz ediyor...</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  statsRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.md },
  statCard: { width: 120, alignItems: 'center', paddingVertical: Spacing.md },
  statIcon: { marginBottom: Spacing.xs },
  statValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },
  chartCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xs },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  tabRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  tab: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceSecondary },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.textLight },
  noChartData: { height: 100, alignItems: 'center', justifyContent: 'center' },
  noChartText: { color: Colors.textMuted, fontSize: FontSize.sm },
  addWeightCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  addWeightRow: { flexDirection: 'row', gap: Spacing.md },
  weightInput: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md, color: Colors.textPrimary,
  },
  addWeightButton: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  addWeightButtonText: { color: Colors.textLight, fontWeight: '700', fontSize: FontSize.md },
  logsCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  logRowBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  logDate: { fontSize: FontSize.md, color: Colors.textSecondary },
  logWeight: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  noLogs: { fontSize: FontSize.md, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.md },
  // Hedef kilo timeline
  targetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: Spacing.md },
  targetStat: { alignItems: 'center', gap: 2 },
  targetStatValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  targetStatLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  targetBarBg: { height: 10, backgroundColor: Colors.borderLight, borderRadius: BorderRadius.full, overflow: 'hidden', marginBottom: Spacing.xs },
  targetBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: BorderRadius.full },
  targetPct: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right', marginBottom: Spacing.sm },
  targetReached: { fontSize: FontSize.md, fontWeight: '700', color: Colors.success, textAlign: 'center', paddingVertical: Spacing.xs },
  targetRemaining: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.xs },
  trendChartLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  trendGoalText: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },
  amdrSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.md, marginTop: -Spacing.xs },
  amdrItem: { marginBottom: Spacing.md },
  amdrLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs, gap: Spacing.xs },
  amdrEmoji: { fontSize: 16 },
  amdrLabel: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  amdrPctBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  amdrPctText: { fontSize: FontSize.xs, fontWeight: '700' },
  amdrGrams: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '500' },
  amdrBarBg: { height: 8, backgroundColor: Colors.borderLight, borderRadius: BorderRadius.full, overflow: 'hidden', marginBottom: 4 },
  amdrBarFill: { height: '100%', borderRadius: BorderRadius.full },
  amdrRangeText: { fontSize: FontSize.xs, color: Colors.textMuted },
  // Vücut ölçüleri
  measureCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  addMeasureBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: BorderRadius.full },
  addMeasureBtnText: { color: Colors.textLight, fontSize: FontSize.sm, fontWeight: '700' },
  measureDate: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.sm },
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  measureItem: { backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, alignItems: 'center', minWidth: '45%', flex: 1 },
  measureValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  measureLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  // Rozetler
  badgesCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  badgesSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.md },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  badgeItem: { backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', width: '48%' },
  badgeLocked: { opacity: 0.45 },
  badgeIcon: { fontSize: 28, marginBottom: 4 },
  badgeIconLocked: {},
  badgeTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  badgeTitleLocked: { color: Colors.textMuted },
  badgeDesc: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },
  // Haftalık analiz
  analysisCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  analysisSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted },
  analysisButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, marginTop: Spacing.sm },
  analysisButtonText: { color: Colors.textLight, fontWeight: '700', fontSize: FontSize.md },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: '90%' },
  analysisModalContent: { maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  modalHint: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.md },
  measureInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, gap: Spacing.sm },
  measureInputLabel: { flex: 1, fontSize: FontSize.md, color: Colors.textSecondary },
  measureTextInput: {
    width: 80, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 8, fontSize: FontSize.md, color: Colors.textPrimary, textAlign: 'center',
  },
  measureUnit: { fontSize: FontSize.sm, color: Colors.textMuted, width: 25 },
  modalSaveBtn: { backgroundColor: Colors.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.md },
  modalSaveBtnText: { color: Colors.textLight, fontWeight: '700', fontSize: FontSize.md },
  analysisLoading: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  analysisLoadingText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  analysisText: { fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 24, paddingBottom: Spacing.xl },
});
