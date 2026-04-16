import { Database } from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Food = Database['public']['Tables']['foods']['Row'];
export type FoodLog = Database['public']['Tables']['food_logs']['Row'];
export type WeightLog = Database['public']['Tables']['weight_logs']['Row'];
export type WaterLog = Database['public']['Tables']['water_logs']['Row'];
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type BodyMeasurement = Database['public']['Tables']['body_measurements']['Row'];
export type StepLog = Database['public']['Tables']['step_logs']['Row'];
export type ExerciseLog = Database['public']['Tables']['exercise_logs']['Row'];
export type ExerciseLogInsert = Database['public']['Tables']['exercise_logs']['Insert'];

export interface FoodLogWithFood extends FoodLog {
  food: Food;
}

export interface DailyNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water_ml: number;
}

export interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water_ml: number;
}
