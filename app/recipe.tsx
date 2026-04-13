import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../lib/constants';
import { generateRecipe, RecipeResult } from '../lib/gemini';
import { Card } from '../components/ui/Card';

const SUGGESTIONS = [
  'Sağlıklı kahvaltı',
  'Hafif akşam yemeği',
  'Protein açısından zengin',
  'Hızlı hazırlanan',
  'Vejetaryen',
  'Sürpriz et!',
];

export default function RecipeScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [request, setRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<RecipeResult | null>(null);

  async function handleGenerate(requestText?: string) {
    const req = (requestText ?? request).trim();
    if (!req) {
      Alert.alert('Hata', 'Lütfen bir tarif isteği girin');
      return;
    }
    if (!profile) {
      Alert.alert('Hata', 'Profil bilgisi yüklenmedi');
      return;
    }
    setLoading(true);
    setRecipe(null);
    try {
      const result = await generateRecipe({ request: req, profile });
      setRecipe(result);
    } catch {
      Alert.alert('Hata', 'Tarif oluşturulamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Tarif Önerisi</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Açıklama */}
          <View style={styles.introBox}>
            <Ionicons name="restaurant" size={32} color={Colors.primary} />
            <Text style={styles.introText}>
              FitBot profilinize göre kişiselleştirilmiş ve sağlıklı tarifler oluşturur.
            </Text>
          </View>

          {/* Input */}
          <Card style={styles.inputCard}>
            <Text style={styles.inputLabel}>Ne yapmak istiyorsunuz?</Text>
            <TextInput
              style={styles.input}
              value={request}
              onChangeText={setRequest}
              placeholder="örn: Fırında tavuk, mercimek çorbası..."
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={200}
            />
            <View style={styles.suggestionRow}>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.suggestionChip}
                  onPress={() => {
                    setRequest(s);
                    handleGenerate(s);
                  }}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <TouchableOpacity
            style={[styles.generateBtn, loading && styles.generateBtnDisabled]}
            onPress={() => handleGenerate()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.textLight} />
            ) : (
              <Ionicons name="sparkles" size={18} color={Colors.textLight} />
            )}
            <Text style={styles.generateBtnText}>
              {loading ? 'Tarif oluşturuluyor...' : 'Tarif Oluştur'}
            </Text>
          </TouchableOpacity>

          {/* Tarif sonucu */}
          {recipe && !loading && (
            <>
              {/* Başlık */}
              <Card style={styles.recipeHeader}>
                <Text style={styles.recipeName}>{recipe.name}</Text>
                <Text style={styles.recipeDesc}>{recipe.description}</Text>
                <View style={styles.recipeMeta}>
                  <View style={styles.recipeMetaItem}>
                    <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
                    <Text style={styles.recipeMetaText}>{recipe.prepTime}</Text>
                  </View>
                  <View style={styles.recipeMetaItem}>
                    <Ionicons name="people-outline" size={16} color={Colors.textMuted} />
                    <Text style={styles.recipeMetaText}>{recipe.servings} kişilik</Text>
                  </View>
                </View>
              </Card>

              {/* Makro özeti */}
              <Card style={styles.macroCard}>
                <Text style={styles.sectionTitle}>Kişi Başı Makrolar</Text>
                <View style={styles.macroRow}>
                  <MacroBox label="Kalori" value={`${recipe.nutrition.calories}`} unit="kcal" color={Colors.accent} />
                  <MacroBox label="Protein" value={`${recipe.nutrition.protein}g`} unit="" color={Colors.protein} />
                  <MacroBox label="Karb" value={`${recipe.nutrition.carbs}g`} unit="" color={Colors.carbs} />
                  <MacroBox label="Yağ" value={`${recipe.nutrition.fat}g`} unit="" color={Colors.fat} />
                </View>
              </Card>

              {/* Malzemeler */}
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Malzemeler</Text>
                {recipe.ingredients.map((ing, i) => (
                  <View key={i} style={styles.ingredientRow}>
                    <View style={styles.bullet} />
                    <Text style={styles.ingredientText}>{ing}</Text>
                  </View>
                ))}
              </Card>

              {/* Yapılış */}
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Yapılış</Text>
                {recipe.steps.map((step, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </Card>

              {/* Yeni tarif butonu */}
              <TouchableOpacity
                style={styles.newRecipeBtn}
                onPress={() => { setRecipe(null); setRequest(''); }}
              >
                <Ionicons name="refresh" size={18} color={Colors.primary} />
                <Text style={styles.newRecipeBtnText}>Yeni Tarif İste</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MacroBox({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={macroBoxStyles.box}>
      <Text style={[macroBoxStyles.value, { color }]}>{value}</Text>
      {unit ? <Text style={macroBoxStyles.unit}>{unit}</Text> : null}
      <Text style={macroBoxStyles.label}>{label}</Text>
    </View>
  );
}

const macroBoxStyles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.md, padding: Spacing.sm },
  value: { fontSize: FontSize.lg, fontWeight: '800' },
  unit: { fontSize: FontSize.xs, color: Colors.textMuted },
  label: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  introBox: {
    alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  introText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  inputCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  inputLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md,
    color: Colors.textPrimary, minHeight: 56, marginBottom: Spacing.md,
  },
  suggestionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  suggestionChip: {
    backgroundColor: Colors.surfaceSecondary, paddingHorizontal: Spacing.sm,
    paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border,
  },
  suggestionText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    backgroundColor: Colors.primary, marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.lg,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: Colors.textLight, fontWeight: '800', fontSize: FontSize.md },
  // Tarif
  recipeHeader: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  recipeName: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs },
  recipeDesc: { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.md },
  recipeMeta: { flexDirection: 'row', gap: Spacing.lg },
  recipeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recipeMetaText: { fontSize: FontSize.sm, color: Colors.textMuted },
  macroCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  macroRow: { flexDirection: 'row', gap: Spacing.sm },
  sectionCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: Spacing.xs },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 7 },
  ingredientText: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 22 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.md },
  stepNumber: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  stepNumberText: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.textLight },
  stepText: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 24 },
  newRecipeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.lg,
    borderWidth: 2, borderColor: Colors.primary,
  },
  newRecipeBtnText: { color: Colors.primary, fontWeight: '700', fontSize: FontSize.md },
});
