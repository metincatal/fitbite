import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useNutritionStore } from '../../store/nutritionStore';
import { geminiFlash, DIETITIAN_SYSTEM_PROMPT } from '../../lib/gemini';
import { Colors, Spacing, FontSize, BorderRadius } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { ChatMessage } from '../../types';

const QUICK_QUESTIONS = [
  'Bugün ne yesem?',
  'Kalori hedefime yakın mıyım?',
  'Protein alımımı nasıl artırırım?',
  'Türk mutfağından sağlıklı öneriler',
];

export default function AIChatScreen() {
  const { profile, user } = useAuthStore();
  const { getDailyTotals } = useNutritionStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const chatHistory = useRef<{ role: 'user' | 'model'; parts: { text: string }[] }[]>([]);

  useEffect(() => {
    loadChatHistory();
    addWelcomeMessage();
  }, []);

  async function loadChatHistory() {
    if (!user) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50);
    if (data && data.length > 0) {
      setMessages(data);
      chatHistory.current = data.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));
    }
  }

  function addWelcomeMessage() {
    if (messages.length === 0) {
      const welcome: ChatMessage = {
        id: 'welcome',
        user_id: '',
        role: 'assistant',
        content: `Merhaba! 👋 Ben FitBot, senin yapay zeka diyetisyeninim.\n\nSana kişiselleştirilmiş beslenme önerileri sunmak için buradayım. Bugün ne yemek istediğini sorabilir, kalori hedefin hakkında yardım alabilir ya da Türk mutfağından sağlıklı tarifler öğrenebilirsin.\n\nNasıl yardımcı olabilirim?`,
        created_at: new Date().toISOString(),
      };
      setMessages([welcome]);
    }
  }

  async function sendMessage(text?: string) {
    const messageText = text ?? input.trim();
    if (!messageText || isTyping) return;

    setInput('');
    setIsTyping(true);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      user_id: user?.id ?? '',
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const totals = getDailyTotals();
    const profileContext = profile
      ? `\n\nKullanıcı Profili:
- Ad: ${profile.name}
- Cinsiyet: ${profile.gender === 'male' ? 'Erkek' : 'Kadın'}
- Yaş: ${new Date().getFullYear() - new Date(profile.birth_date).getFullYear()}
- Kilo: ${profile.weight_kg} kg, Boy: ${profile.height_cm} cm
- Hedef: ${profile.goal === 'lose' ? 'Kilo vermek' : profile.goal === 'gain' ? 'Kilo almak' : 'Kiloyu korumak'}
- Diyet tercihi: ${profile.diet_type}
- Günlük kalori hedefi: ${profile.daily_calorie_goal} kcal
- Bugün tüketilen: ${Math.round(totals.calories)} kcal (Protein: ${Math.round(totals.protein)}g, Karb: ${Math.round(totals.carbs)}g, Yağ: ${Math.round(totals.fat)}g)`
      : '';

    try {
      const fullSystemPrompt = DIETITIAN_SYSTEM_PROMPT + profileContext;
      chatHistory.current.push({ role: 'user', parts: [{ text: messageText }] });

      const chat = geminiFlash.startChat({
        history: [
          { role: 'user', parts: [{ text: fullSystemPrompt }] },
          { role: 'model', parts: [{ text: 'Anlaşıldı! Sana en iyi şekilde yardımcı olmak için hazırım.' }] },
          ...chatHistory.current.slice(0, -1),
        ],
      });

      const result = await chat.sendMessage(messageText);
      const responseText = result.response.text();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        user_id: user?.id ?? '',
        role: 'assistant',
        content: responseText,
        created_at: new Date().toISOString(),
      };

      chatHistory.current.push({ role: 'model', parts: [{ text: responseText }] });
      setMessages((prev) => [...prev, assistantMessage]);

      if (user) {
        await supabase.from('chat_messages').insert([
          { user_id: user.id, role: 'user' as const, content: messageText },
          { user_id: user.id, role: 'assistant' as const, content: responseText },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          user_id: '',
          role: 'assistant',
          content: 'Üzgünüm, şu an cevap veremiyorum. Lütfen tekrar dene.',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.botAvatar}>
          <Ionicons name="sparkles" size={22} color={Colors.primary} />
        </View>
        <View>
          <Text style={styles.botName}>FitBot</Text>
          <Text style={styles.botStatus}>Yapay Zeka Diyetisyeniniz</Text>
        </View>
      </View>

      {/* Mesaj listesi + input — KeyboardAvoidingView her ikisini de kapsar */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={[styles.message, item.role === 'user' ? styles.userMessage : styles.botMessage]}>
              {item.role === 'assistant' && (
                <View style={styles.botMessageAvatar}>
                  <Ionicons name="sparkles" size={14} color={Colors.primary} />
                </View>
              )}
              <View style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.botBubble]}>
                <Text style={[styles.messageText, item.role === 'user' && styles.userMessageText]}>
                  {item.content}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            isTyping ? (
              <View style={[styles.message, styles.botMessage]}>
                <View style={styles.botMessageAvatar}>
                  <Ionicons name="sparkles" size={14} color={Colors.primary} />
                </View>
                <View style={[styles.messageBubble, styles.botBubble, styles.typingBubble]}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.typingText}>FitBot yazıyor...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Hızlı Sorular */}
        {messages.length <= 1 && (
          <View>
            <Text style={styles.quickQuestionsLabel}>Hızlı sorular:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickQuestionsScroll}
              style={styles.quickQuestionsContainer}
              keyboardShouldPersistTaps="handled"
            >
              {QUICK_QUESTIONS.map((q) => (
                <TouchableOpacity key={q} style={styles.quickQuestion} onPress={() => sendMessage(q)}>
                  <Text style={styles.quickQuestionText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Giriş Alanı */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Bir şey sor..."
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || isTyping) && styles.sendButtonDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || isTyping}
          >
            <Ionicons name="send" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  botAvatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  botStatus: { fontSize: FontSize.sm, color: Colors.primaryLight },
  keyboardView: { flex: 1 },
  messageList: { padding: Spacing.md, paddingBottom: Spacing.sm },
  message: { flexDirection: 'row', marginBottom: Spacing.md, alignItems: 'flex-end' },
  userMessage: { justifyContent: 'flex-end' },
  botMessage: { justifyContent: 'flex-start' },
  botMessageAvatar: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  messageText: { fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 22 },
  userMessageText: { color: Colors.textLight },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  typingText: { fontSize: FontSize.sm, color: Colors.textMuted },
  quickQuestionsLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  quickQuestionsContainer: { marginBottom: Spacing.sm },
  quickQuestionsScroll: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  quickQuestion: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickQuestionText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    maxHeight: 100,
    backgroundColor: Colors.background,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: Colors.border },
});
