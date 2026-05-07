import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../store/authStore';
import { useNutritionStore } from '../../../store/nutritionStore';
import { useChatStore } from '../../../store/chatStore';
import { DIETITIAN_SYSTEM_PROMPT, generateConversationTitle } from '../../../lib/gemini';
import { MarkdownText } from '../../../components/ui/MarkdownText';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY!);
import { Colors, Spacing, FontSize, BorderRadius } from '../../../lib/constants';
import { ChatMessage } from '../../../types';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' });


const QUICK_QUESTIONS = [
  'Bugün ne yesem?',
  'Kalori hedefime yakın mıyım?',
  'Protein alımımı nasıl artırırım?',
  'Türk mutfağından sağlıklı öneriler',
];

export default function ChatScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuthStore();
  const { getDailyTotals } = useNutritionStore();
  const { messages, fetchMessages, addMessage, updateConversationTitle, conversations } =
    useChatStore();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [welcomeShown, setWelcomeShown] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const chatHistory = useRef<{ role: 'user' | 'model'; parts: { text: string }[] }[]>([]);
  const titleGenerated = useRef(false);

  const currentConversation = conversations.find((c) => c.id === conversationId);

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId).then(() => {
        // Mesajlar yuklendikten sonra Gemini gecmisini olustur
        const msgs = useChatStore.getState().messages;
        chatHistory.current = msgs.map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));
        if (msgs.length === 0) {
          setWelcomeShown(true);
        }
      });
    }
  }, [conversationId]);

  // Mesaj listesinde otomatik kaydir
  const displayMessages: ChatMessage[] = welcomeShown && messages.length === 0
    ? [{
        id: 'welcome',
        user_id: '',
        role: 'assistant',
        content: 'Merhaba! Ben FitBot, senin yapay zeka diyetisyeninim.\n\nSana kisisellestirilmis beslenme onerileri sunmak icin buradayim. Bugun ne yemek istedigini sorabilir, kalori hedefin hakkinda yardim alabilir ya da Turk mutfagindan saglikli tarifler ogrenebilirsin.\n\nNasil yardimci olabilirim?',
        conversation_id: conversationId ?? null,
        created_at: new Date().toISOString(),
      }]
    : messages;

  async function sendMessage(text?: string) {
    const messageText = text ?? input.trim();
    if (!messageText || isTyping || !user || !conversationId) return;

    setInput('');
    setIsTyping(true);
    setWelcomeShown(false);

    // Kullanici mesajini kaydet
    await addMessage({
      user_id: user.id,
      role: 'user',
      content: messageText,
      conversation_id: conversationId,
    });

    const totals = getDailyTotals();
    const profileContext = profile
      ? `\n\nKullanici Profili:
- Ad: ${profile.name}
- Cinsiyet: ${profile.gender === 'male' ? 'Erkek' : 'Kadin'}
- Yas: ${new Date().getFullYear() - new Date(profile.birth_date).getFullYear()}
- Kilo: ${profile.weight_kg} kg, Boy: ${profile.height_cm} cm
- Hedef: ${profile.goal === 'lose' ? 'Kilo vermek' : profile.goal === 'gain' ? 'Kilo almak' : 'Kiloyu korumak'}
- Diyet tercihi: ${profile.diet_type}
- Gunluk kalori hedefi: ${profile.daily_calorie_goal} kcal
- Bugun tuketilen: ${Math.round(totals.calories)} kcal (Protein: ${Math.round(totals.protein)}g, Karb: ${Math.round(totals.carbs)}g, Yag: ${Math.round(totals.fat)}g)`
      : '';

    try {
      const fullSystemPrompt = DIETITIAN_SYSTEM_PROMPT + profileContext;
      chatHistory.current.push({ role: 'user', parts: [{ text: messageText }] });

      const chatModel = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: fullSystemPrompt,
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      });

      const chat = chatModel.startChat({
        history: chatHistory.current.slice(0, -1),
      });

      const result = await chat.sendMessage(messageText);
      const responseText = result.response.text().replace(/\n{3,}/g, '\n\n').trim();

      chatHistory.current.push({ role: 'model', parts: [{ text: responseText }] });

      // Asistan mesajini kaydet
      await addMessage({
        user_id: user.id,
        role: 'assistant',
        content: responseText,
        conversation_id: conversationId,
      });

      // Ilk mesajda otomatik baslik uret (Yeni Sohbet veya hicbir mesaj yoksa)
      const conv = useChatStore.getState().conversations.find((c) => c.id === conversationId);
      if (!titleGenerated.current && (conv?.title === 'Yeni Sohbet' || !conv?.title)) {
        titleGenerated.current = true;
        generateConversationTitle(messageText)
          .then((title) => { if (title) updateConversationTitle(conversationId, title); })
          .catch(() => {});
      }
    } catch (err) {
      console.error('[FitBot] Gemini hatasi:', err);
      const isQuota = String(err).includes('429') || String(err).toLowerCase().includes('quota');
      const errorMsg = isQuota
        ? 'API kotası doldu. Google AI Studio üzerinden faturalama ayarlarını kontrol et.'
        : `Bir hata olustu: ${String(err).slice(0, 120)}`;
      await addMessage({
        user_id: user.id,
        role: 'assistant',
        content: errorMsg,
        conversation_id: conversationId,
      });
    } finally {
      setIsTyping(false);
    }
  }

  useEffect(() => {
    if (displayMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [displayMessages.length]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Editorial Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={Colors.ink} />
        </TouchableOpacity>
        <View style={styles.botAvatar}>
          <Ionicons name="sparkles" size={18} color={Colors.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerOverline}>FİTBOT · DİYETİSYEN</Text>
          <Text style={styles.botName} numberOfLines={1}>
            {currentConversation?.title ?? 'FitBot'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View
              style={[
                styles.message,
                item.role === 'user' ? styles.userMessage : styles.botMessage,
              ]}
            >
              {item.role === 'assistant' && (
                <View style={styles.botMessageAvatar}>
                  <Ionicons name="sparkles" size={14} color={Colors.primary} />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  item.role === 'user' ? styles.userBubble : styles.botBubble,
                ]}
              >
                {item.role === 'user' ? (
                  <Text style={[styles.messageText, styles.userMessageText]}>
                    {item.content}
                  </Text>
                ) : (
                  <MarkdownText content={item.content} baseStyle={styles.botMessageText} />
                )}
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
                  <Text style={styles.typingText}>FitBot yazıyor…</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Hızlı Sorular */}
        {displayMessages.length <= 1 && (
          <View>
            <Text style={styles.quickQuestionsLabel}>HIZLI SORULAR</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickQuestionsScroll}
              style={styles.quickQuestionsContainer}
              keyboardShouldPersistTaps="handled"
            >
              {QUICK_QUESTIONS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={styles.quickQuestion}
                  onPress={() => sendMessage(q)}
                >
                  <Text style={styles.quickQuestionText}>{q}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.quickQuestion, styles.recipeQuickBtn]}
                onPress={() => router.push('/recipe')}
              >
                <Ionicons name="restaurant-outline" size={14} color={Colors.accent} />
                <Text style={[styles.quickQuestionText, { color: Colors.accent }]}>
                  Tarif Onerisi
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Giriş Alanı */}
        <View style={[styles.inputRow, { paddingBottom: Math.max(Spacing.sm, insets.bottom) + 4 }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Bir şey sor…"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || isTyping) && styles.sendButtonDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || isTyping}
          >
            <Ionicons name="send" size={18} color={Colors.background} />
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
    paddingHorizontal: 14,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botAvatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerOverline: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.ink3,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  botName: {
    fontFamily: SERIF,
    fontSize: 18,
    color: Colors.ink,
    marginTop: 2,
  },
  keyboardView: { flex: 1 },
  messageList: { padding: Spacing.md, paddingBottom: Spacing.sm },
  message: { flexDirection: 'row', marginBottom: Spacing.md, alignItems: 'flex-end' },
  userMessage: { justifyContent: 'flex-end' },
  botMessage: { justifyContent: 'flex-start' },
  botMessageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: Colors.ink,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
  },
  messageText: {
    fontFamily: SERIF,
    fontSize: 15,
    color: Colors.ink,
    lineHeight: 22,
  },
  botMessageText: {
    fontFamily: SERIF,
    fontSize: 15,
    color: Colors.ink,
    lineHeight: 22,
  },
  userMessageText: { color: Colors.background },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  typingText: {
    fontFamily: MONO,
    fontSize: 12,
    color: Colors.ink3,
    letterSpacing: 0.3,
  },
  quickQuestionsLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.ink3,
    paddingHorizontal: 22,
    marginBottom: 8,
    letterSpacing: 1.4,
  },
  quickQuestionsContainer: { marginBottom: Spacing.sm },
  quickQuestionsScroll: { paddingHorizontal: 22, gap: 8 },
  quickQuestion: {
    backgroundColor: Colors.surface,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: Colors.line,
  },
  quickQuestionText: {
    fontFamily: SERIF,
    fontSize: 13,
    color: Colors.ink2,
  },
  recipeQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderColor: Colors.accent + '60',
    backgroundColor: Colors.accent + '12',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: Colors.line,
    borderRadius: 18,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontFamily: SERIF,
    fontSize: 15,
    color: Colors.ink,
    maxHeight: 100,
    backgroundColor: Colors.surface,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: Colors.border },
});
