import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../lib/constants';
import { FoodLogWithFood } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.75;

interface FoodPhotoModalProps {
  visible: boolean;
  onClose: () => void;
  log: FoodLogWithFood | null;
}

export function FoodPhotoModal({ visible, onClose, log }: FoodPhotoModalProps) {
  if (!log || !log.image_url) return null;

  const food = log.food;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Yemek Detayi</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Fotograf */}
        <Image
          source={{ uri: log.image_url }}
          style={styles.photo}
          resizeMode="cover"
        />

        {/* Yemek Bilgileri */}
        <View style={styles.infoSection}>
          <Text style={styles.foodName}>{food?.name_tr ?? food?.name ?? 'Bilinmiyor'}</Text>
          {food?.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{food.category}</Text>
            </View>
          ) : null}

          <Text style={styles.servingText}>{log.serving_amount}g porsiyon</Text>

          {/* Besin Degerleri */}
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{Math.round(log.calories)}</Text>
              <Text style={styles.nutritionLabel}>kcal</Text>
            </View>
            <View style={[styles.nutritionItem, { backgroundColor: `${Colors.protein}15` }]}>
              <Text style={[styles.nutritionValue, { color: Colors.protein }]}>
                {log.protein}g
              </Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>
            <View style={[styles.nutritionItem, { backgroundColor: `${Colors.carbs}15` }]}>
              <Text style={[styles.nutritionValue, { color: Colors.carbs }]}>
                {log.carbs}g
              </Text>
              <Text style={styles.nutritionLabel}>Karb</Text>
            </View>
            <View style={[styles.nutritionItem, { backgroundColor: `${Colors.fat}15` }]}>
              <Text style={[styles.nutritionValue, { color: Colors.fat }]}>
                {log.fat}g
              </Text>
              <Text style={styles.nutritionLabel}>Yag</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: Colors.borderLight,
  },
  infoSection: {
    padding: Spacing.lg,
  },
  foodName: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryPale,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  categoryText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  servingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  nutritionGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  nutritionItem: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  nutritionLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
