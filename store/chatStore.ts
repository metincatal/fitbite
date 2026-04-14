import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Conversation, ChatMessage } from '../types';

interface ChatState {
  conversations: Conversation[];
  messages: ChatMessage[];
  isLoading: boolean;

  fetchConversations: (userId: string) => Promise<void>;
  createConversation: (userId: string, title?: string) => Promise<string | null>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  addMessage: (msg: {
    user_id: string;
    role: 'user' | 'assistant';
    content: string;
    conversation_id: string;
  }) => Promise<void>;
  migrateOrphanMessages: (userId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: [],
  isLoading: false,

  fetchConversations: async (userId) => {
    set({ isLoading: true });
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    set({ conversations: data ?? [], isLoading: false });
  },

  createConversation: async (userId, title = 'Yeni Sohbet') => {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: userId, title })
      .select()
      .single();

    if (error || !data) return null;

    set((state) => ({ conversations: [data, ...state.conversations] }));
    return data.id;
  },

  deleteConversation: async (id) => {
    await supabase.from('conversations').delete().eq('id', id);
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
    }));
  },

  updateConversationTitle: async (id, title) => {
    await supabase
      .from('conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', id);

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    }));
  },

  fetchMessages: async (conversationId) => {
    set({ isLoading: true });
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100);

    set({ messages: data ?? [], isLoading: false });
  },

  addMessage: async (msg) => {
    const { data } = await supabase
      .from('chat_messages')
      .insert(msg)
      .select()
      .single();

    if (data) {
      set((state) => ({ messages: [...state.messages, data] }));
    }

    // Conversation'in updated_at'ini guncelle
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', msg.conversation_id);
  },

  migrateOrphanMessages: async (userId) => {
    // conversation_id'si null olan eski mesajlari kontrol et
    const { data: orphans } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('user_id', userId)
      .is('conversation_id', null)
      .limit(1);

    if (!orphans || orphans.length === 0) return;

    // "Onceki Sohbetler" adinda bir conversation olustur
    const { data: conv } = await supabase
      .from('conversations')
      .insert({ user_id: userId, title: 'Onceki Sohbetler' })
      .select()
      .single();

    if (!conv) return;

    // Tum orphan mesajlari bu conversation'a iliskilendir
    await supabase
      .from('chat_messages')
      .update({ conversation_id: conv.id })
      .eq('user_id', userId)
      .is('conversation_id', null);
  },
}));
