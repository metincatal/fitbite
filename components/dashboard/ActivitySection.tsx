import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../lib/constants';
import { Card } from '../ui/Card';
import { ActivityRing } from '../charts/ActivityRing';

interface ActivitySectionProps {
  steps: number;
  stepGoal: number;
  caloriesBurned: number;
  distanceKm: number;
  activeMinutes: number;
  isAvailable: boolean;
  permissionGranted: boolean;
}

export function ActivitySection({
  steps,
  stepGoal,
  caloriesBurned,
  distanceKm,
  activeMinutes,
  isAvailable,
  permissionGranted,
}: ActivitySectionProps) {
  if (!isAvailable || !permissionGranted) {
    const permissionHint = Platform.OS === 'ios'
      ? 'Ayarlar > Gizlilik > Hareket ve Kondisyon bölümünde FitBite için izni açın.'
      : 'Ayarlar > Uygulamalar > FitBite > İzinler bölümünde "Fiziksel Aktivite" iznini açın.';

    return (
      <Card style={styles.unavailableCard}>
        <Ionicons name="footsteps-outline" size={24} color={Colors.textMuted} />
        <View style={{ flex: 1 }}>
          <Text style={styles.unavailableText}>
            {!isAvailable
              ? 'Adim sayaci bu cihazda desteklenmiyor'
              : 'Adim sayaci icin izin gerekli'}
          </Text>
          {isAvailable && !permissionGranted && (
            <Text style={styles.permissionHint}>{permissionHint}</Text>
          )}
        </View>
        {isAvailable && !permissionGranted && (
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => {
              Alert.alert(
                'Hareket İzni Gerekli',
                permissionHint,
                [
                  { text: 'İptal', style: 'cancel' },
                  {
                    text: 'Ayarları Aç',
                    onPress: () => {
                      if (Platform.OS === 'ios') {
                        Linking.openURL('app-settings:');
                      } else {
                        Linking.openSettings();
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.permissionButtonText}>Nasıl Açılır?</Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Gunluk Aktivite</Text>
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <ActivityRing
            value={steps}
            goal={stepGoal}
            color={Colors.primary}
            label="Adimlar"
            unit="adim"
          />
        </View>
        <View style={styles.gridItem}>
          <ActivityRing
            value={caloriesBurned}
            goal={300}
            color={Colors.accent}
            label="Yakilan"
            unit="kcal"
          />
        </View>
        <View style={styles.gridItem}>
          <ActivityRing
            value={distanceKm}
            goal={5}
            color={Colors.fiber}
            label="Mesafe"
            unit="km"
          />
        </View>
        <View style={styles.gridItem}>
          <ActivityRing
            value={activeMinutes}
            goal={60}
            color={Colors.fat}
            label="Aktif Sure"
            unit="dk"
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: Spacing.md,
  },
  gridItem: {
    alignItems: 'center',
    width: '40%',
  },
  unavailableCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  unavailableText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  permissionHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  permissionButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textLight,
  },
});
