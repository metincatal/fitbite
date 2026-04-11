export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    PostgrestVersion: '12';
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          gender: 'male' | 'female';
          birth_date: string;
          height_cm: number;
          weight_kg: number;
          activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
          goal: 'lose' | 'maintain' | 'gain';
          diet_type: 'normal' | 'vegetarian' | 'vegan' | 'gluten_free' | 'lactose_free';
          allergies: string[];
          daily_calorie_goal: number;
          daily_protein_goal: number;
          daily_carbs_goal: number;
          daily_fat_goal: number;
          daily_water_goal_ml: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          gender: 'male' | 'female';
          birth_date: string;
          height_cm: number;
          weight_kg: number;
          activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
          goal?: 'lose' | 'maintain' | 'gain';
          diet_type?: 'normal' | 'vegetarian' | 'vegan' | 'gluten_free' | 'lactose_free';
          allergies?: string[];
          daily_calorie_goal?: number;
          daily_protein_goal?: number;
          daily_carbs_goal?: number;
          daily_fat_goal?: number;
          daily_water_goal_ml?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      foods: {
        Row: {
          id: string;
          name: string;
          name_tr: string;
          category: string;
          calories_per_100g: number;
          protein: number;
          carbs: number;
          fat: number;
          fiber: number;
          serving_size: number;
          serving_unit: string;
          is_turkish: boolean;
          image_url: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_tr: string;
          category: string;
          calories_per_100g: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          fiber?: number;
          serving_size?: number;
          serving_unit?: string;
          is_turkish?: boolean;
          image_url?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['foods']['Insert']>;
        Relationships: [];
      };
      food_logs: {
        Row: {
          id: string;
          user_id: string;
          food_id: string;
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          serving_amount: number;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          logged_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          food_id: string;
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          serving_amount: number;
          calories: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          logged_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['food_logs']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'food_logs_food_id_fkey';
            columns: ['food_id'];
            isOneToOne: false;
            referencedRelation: 'foods';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'food_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      weight_logs: {
        Row: {
          id: string;
          user_id: string;
          weight_kg: number;
          logged_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          weight_kg: number;
          logged_at?: string;
        };
        Update: Partial<Database['public']['Tables']['weight_logs']['Insert']>;
        Relationships: [];
      };
      water_logs: {
        Row: {
          id: string;
          user_id: string;
          amount_ml: number;
          logged_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount_ml: number;
          logged_at?: string;
        };
        Update: Partial<Database['public']['Tables']['water_logs']['Insert']>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
        Relationships: [];
      };
      body_measurements: {
        Row: {
          id: string;
          user_id: string;
          waist_cm: number | null;
          hip_cm: number | null;
          chest_cm: number | null;
          arm_cm: number | null;
          logged_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          waist_cm?: number | null;
          hip_cm?: number | null;
          chest_cm?: number | null;
          arm_cm?: number | null;
          logged_at?: string;
        };
        Update: Partial<Database['public']['Tables']['body_measurements']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
