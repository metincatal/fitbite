import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../../lib/constants';
import { WeightLog } from '../../types';
import { Card } from '../../components/ui/Card';
import { calculateBMI, getBMICategory } from '../../lib/nutrition';

const screenWidth = Dimensions.get('window').width;

export default function ProgressScreen() {
  const { user, profile } = useAuthStore();
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [activeTab, setActiveTab] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    fetchWeightLogs();
  }, [user]);

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

  const filteredLogs = weightLogs.slice(
    activeTab === 'week' ? -7 : activeTab === 'month' ? -30 : 0
  );

  const chartData = {
    labels: filteredLogs
      .filter((_, i) => filteredLogs.length <= 7 || i % Math.ceil(filteredLogs.length / 7) === 0)
      .map((l) => new Date(l.logged_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })),
    datasets: [{
      data: filteredLogs.length > 0
        ? filteredLogs.map((l) => l.weight_kg)
        : [profile?.weight_kg ?? 70],
    }],
  };

  const currentWeight = weightLogs[weightLogs.length - 1]?.weight_kg ?? profile?.weight_kg;
  const bmi = currentWeight && profile?.height_cm
    ? calculateBMI(currentWeight, profile.height_cm)
    : null;
  const startWeight = weightLogs[0]?.weight_kg ?? profile?.weight_kg;
  const weightChange = currentWeight && startWeight ? currentWeight - startWeight : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>İlerleme</Text>

        {/* Özet Kartlar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statEmoji}>⚖️</Text>
            <Text style={styles.statValue}>{currentWeight?.toFixed(1) ?? '—'} kg</Text>
            <Text style={styles.statLabel}>Güncel Kilo</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statEmoji}>{weightChange <= 0 ? '📉' : '📈'}</Text>
            <Text style={[styles.statValue, { color: weightChange <= 0 ? Colors.success : Colors.error }]}>
              {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
            </Text>
            <Text style={styles.statLabel}>Değişim</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statEmoji}>📊</Text>
            <Text style={styles.statValue}>{bmi ?? '—'}</Text>
            <Text style={styles.statLabel}>BMI {bmi ? `(${getBMICategory(bmi)})` : ''}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statEmoji}>🎯</Text>
            <Text style={styles.statValue}>{profile?.weight_kg ?? '—'} kg</Text>
            <Text style={styles.statLabel}>Başlangıç</Text>
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
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: Colors.primary,
                  fill: Colors.primaryPale,
                },
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
          <Text style={styles.sectionTitle}>Son Ölçümler</Text>
          {weightLogs.slice(-5).reverse().map((log, index) => (
            <View key={log.id} style={[styles.logRow, index > 0 && styles.logRowBorder]}>
              <Text style={styles.logDate}>
                {new Date(log.logged_at).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.logWeight}>{log.weight_kg} kg</Text>
            </View>
          ))}
          {weightLogs.length === 0 && (
            <Text style={styles.noLogs}>Henüz kilo ölçümü yok</Text>
          )}
        </Card>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  statsRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.md },
  statCard: { width: 120, alignItems: 'center', paddingVertical: Spacing.md },
  statEmoji: { fontSize: 24, marginBottom: Spacing.xs },
  statValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },
  chartCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
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
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  addWeightButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addWeightButtonText: { color: Colors.textLight, fontWeight: '700', fontSize: FontSize.md },
  logsCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  logRowBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  logDate: { fontSize: FontSize.md, color: Colors.textSecondary },
  logWeight: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  noLogs: { fontSize: FontSize.md, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.md },
});
