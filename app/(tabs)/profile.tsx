import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius, ACTIVITY_LEVELS, GOALS, DIET_TYPES } from '../../lib/constants';
import { Card } from '../../components/ui/Card';
import { calculateBMI, getBMICategory, calculateDailyCalorieGoal, calculateMacroGoals } from '../../lib/nutrition';

export default function ProfileScreen() {
  const { profile, user, signOut } = useAuthStore();

  function handleSignOut() {
    Alert.alert(
      'Çıkış Yap',
      'Hesabından çıkmak istediğine emin misin?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
      ]
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>👤</Text>
          <Text style={styles.emptyText}>Profil bilgileri yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const bmi = calculateBMI(profile.weight_kg, profile.height_cm);
  const age = new Date().getFullYear() - new Date(profile.birth_date).getFullYear();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profil Başlığı */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>
              {profile.gender === 'male' ? '👨' : '👩'}
            </Text>
          </View>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.profileBadges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {GOALS[profile.goal]?.label ?? profile.goal}
              </Text>
            </View>
            <View style={[styles.badge, styles.badgeSecondary]}>
              <Text style={styles.badgeText}>
                {DIET_TYPES[profile.diet_type] ?? profile.diet_type}
              </Text>
            </View>
          </View>
        </View>

        {/* Vücut İstatistikleri */}
        <Card style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Vücut Bilgileri</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.weight_kg} kg</Text>
              <Text style={styles.statLabel}>Kilo</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.height_cm} cm</Text>
              <Text style={styles.statLabel}>Boy</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{age}</Text>
              <Text style={styles.statLabel}>Yaş</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: getBMIColor(bmi) }]}>{bmi}</Text>
              <Text style={styles.statLabel}>BMI ({getBMICategory(bmi)})</Text>
            </View>
          </View>
        </Card>

        {/* Günlük Hedefler */}
        <Card style={styles.goalsCard}>
          <Text style={styles.sectionTitle}>Günlük Hedefler</Text>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>🔥 Kalori</Text>
            <Text style={styles.goalValue}>{profile.daily_calorie_goal} kcal</Text>
          </View>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>💪 Protein</Text>
            <Text style={styles.goalValue}>{profile.daily_protein_goal} g</Text>
          </View>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>🌾 Karbonhidrat</Text>
            <Text style={styles.goalValue}>{profile.daily_carbs_goal} g</Text>
          </View>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>🥑 Yağ</Text>
            <Text style={styles.goalValue}>{profile.daily_fat_goal} g</Text>
          </View>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>💧 Su</Text>
            <Text style={styles.goalValue}>{(profile.daily_water_goal_ml / 1000).toFixed(1)} L</Text>
          </View>
        </Card>

        {/* Aktivite Seviyesi */}
        <Card style={styles.activityCard}>
          <Text style={styles.sectionTitle}>Aktivite Seviyesi</Text>
          <Text style={styles.activityValue}>
            {ACTIVITY_LEVELS[profile.activity_level]?.label ?? profile.activity_level}
          </Text>
        </Card>

        {/* Alerjiler */}
        {profile.allergies && profile.allergies.length > 0 && (
          <Card style={styles.allergiesCard}>
            <Text style={styles.sectionTitle}>Alerjiler & Kısıtlamalar</Text>
            <View style={styles.tagsRow}>
              {profile.allergies.map((allergy) => (
                <View key={allergy} style={styles.tag}>
                  <Text style={styles.tagText}>{allergy}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Ayarlar Bölümü */}
        <Card style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingIcon}>✏️</Text>
            <Text style={styles.settingLabel}>Profili Düzenle</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingIcon}>🔔</Text>
            <Text style={styles.settingLabel}>Bildirim Ayarları</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingIcon}>🛡️</Text>
            <Text style={styles.settingLabel}>Gizlilik & Güvenlik</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={handleSignOut}>
            <Text style={styles.settingIcon}>🚪</Text>
            <Text style={[styles.settingLabel, { color: Colors.error }]}>Çıkış Yap</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </Card>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getBMIColor(bmi: number): string {
  if (bmi < 18.5) return Colors.info;
  if (bmi < 25) return Colors.success;
  if (bmi < 30) return Colors.warning;
  return Colors.error;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  profileHeader: { alignItems: 'center', paddingVertical: Spacing.xl },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarEmoji: { fontSize: 48 },
  profileName: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  profileEmail: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4 },
  profileBadges: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeSecondary: { backgroundColor: Colors.primaryLight },
  badgeText: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600' },
  statsCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  statItem: { flex: 1, minWidth: '40%', alignItems: 'center', backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md, padding: Spacing.md },
  statValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  goalsCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  goalLabel: { fontSize: FontSize.md, color: Colors.textSecondary },
  goalValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  activityCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  activityValue: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.primary },
  allergiesCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: { backgroundColor: Colors.accentLight, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  tagText: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: '600' },
  settingsCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, paddingVertical: Spacing.sm },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, gap: Spacing.md },
  settingIcon: { fontSize: 20, width: 28 },
  settingLabel: { flex: 1, fontSize: FontSize.md, fontWeight: '500', color: Colors.textPrimary },
  settingArrow: { fontSize: FontSize.xl, color: Colors.textMuted },
});
