import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../lib/constants';
import { useAuthStore } from '../../../store/authStore';
import { useChatStore } from '../../../store/chatStore';
import { Conversation } from '../../../types';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo' });
const TAB_BAR_CLEARANCE = Platform.OS === 'ios' ? 120 : 110;

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Şimdi';
  if (diffMin < 60) return `${diffMin} dk önce`;
  if (diffHour < 24) return `${diffHour} saat önce`;
  if (diffDay === 1) return 'Dün';
  if (diffDay < 7) return `${diffDay} gün önce`;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export default function ConversationListScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    conversations,
    fetchConversations,
    createConversation,
    deleteConversation,
    migrateOrphanMessages,
    isLoading,
  } = useChatStore();

  useEffect(() => {
    if (user) {
      migrateOrphanMessages(user.id);
      fetchConversations(user.id);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    if (user) await fetchConversations(user.id);
  }, [user]);

  async function handleNewChat() {
    if (!user) return;
    const id = await createConversation(user.id);
    if (id) {
      router.push(`/(tabs)/ai-chat/${id}`);
    }
  }

  function handleDelete(conv: Conversation) {
    Alert.alert('Sohbeti Sil', `"${conv.title}" silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => deleteConversation(conv.id),
      },
    ]);
  }

  function renderConversation({ item }: { item: Conversation }) {
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => router.push(`/(tabs)/ai-chat/${item.id}`)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={styles.conversationIcon}>
          <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
        </View>
        <View style={styles.conversationInfo}>
          <Text style={styles.conversationTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.conversationTime}>
            {getRelativeTime(item.updated_at)}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Editorial Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.botAvatar}>
            <Ionicons name="sparkles" size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>YAPAY ZEKA DİYETİSYENİN</Text>
            <Text style={styles.botName}>
              Fit<Text style={styles.botNameAccent}>Bot</Text>
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color={Colors.background} />
        </TouchableOpacity>
      </View>

      {/* Sohbet Listesi */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_CLEARANCE }]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          conversations.length > 0
            ? <Text style={[styles.overline, styles.listHeader]}>SOHBETLERİN</Text>
            : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              Henüz <Text style={styles.emptyTitleAccent}>sohbet</Text> yok
            </Text>
            <Text style={styles.emptySubtitle}>
              Sorularını sor, plan kur, tarif iste — FitBot her zaman burada.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleNewChat} activeOpacity={0.85}>
              <Ionicons name="add" size={18} color={Colors.background} />
              <Text style={styles.emptyButtonText}>YENİ SOHBET BAŞLAT</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  botAvatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overline: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.ink3,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  botName: {
    fontFamily: SERIF,
    fontSize: 26,
    color: Colors.ink,
    lineHeight: 30,
    marginTop: 2,
  },
  botNameAccent: {
    color: Colors.terracotta,
    fontStyle: 'italic',
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  listHeader: {
    paddingHorizontal: 22,
    paddingTop: Spacing.md,
    paddingBottom: 6,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  conversationIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTitle: {
    fontFamily: SERIF,
    fontSize: 16,
    color: Colors.ink,
  },
  conversationTime: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.ink3,
    marginTop: 3,
    letterSpacing: 0.3,
  },
  chevron: {
    fontFamily: SERIF,
    fontSize: 24,
    color: Colors.textFaint,
    lineHeight: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 100,
    gap: Spacing.md,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: SERIF,
    fontSize: 26,
    color: Colors.ink,
    lineHeight: 30,
    textAlign: 'center',
  },
  emptyTitleAccent: {
    color: Colors.terracotta,
    fontStyle: 'italic',
  },
  emptySubtitle: {
    fontFamily: SERIF,
    fontSize: 14,
    color: Colors.ink3,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.ink,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: 999,
  },
  emptyButtonText: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.background,
    letterSpacing: 1.0,
  },
});
