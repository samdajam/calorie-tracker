export type MealType = 'breakfast' | 'morningSnack' | 'lunch' | 'afternoonSnack' | 'dinner';

export interface FoodItem {
  id: string;
  name: string;
  portion: string;
  calories: number;
  protein: number; // in grams
  carbs: number;   // in grams
  fats: number;    // in grams
  checked?: boolean;
}

export interface MealSlot {
  type: MealType;
  label: string;
  recommendedCalRatio: number; // e.g. 0.25 = 25% of daily target
  items: FoodItem[];
  notes?: string;
}

export interface DailyTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  waterGlasses: number; // 250ml per glass
}

export interface DailyPlanState {
  dateIso: string; // 'YYYY-MM-DD'
  date: string;    // 'Friday, Feb 14'
  targets: DailyTargets;
  waterConsumed: number; // number of glasses
  meals: Record<MealType, MealSlot>;
}

export interface DaySummaryInfo {
  dateIso: string;
  totalCalories: number;
  itemCount: number;
}

export interface WeeklyTrendDayData {
  dateIso: string;
  dayLabel: string;
  shortDate: string;
  isToday: boolean;
  caloriesConsumed: number;
  caloriesTarget: number;
  proteinConsumed: number;
  proteinTarget: number;
  carbsConsumed: number;
  carbsTarget: number;
  fatsConsumed: number;
  fatsTarget: number;
  waterConsumed: number;
  waterTarget: number;
  itemCount: number;
  calorieDelta: number; // consumed - target
  status: 'on-target' | 'surplus' | 'deficit' | 'unlogged';
}

export interface WeeklySummaryMetrics {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
  avgWater: number;
  daysLogged: number;
  daysOnTarget: number;
  surplusDaysCount: number;
  deficitDaysCount: number;
  proteinDeficitDaysCount: number;
}

export interface GeneratedMealPlanResponse {
  summary: string;
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  meals: {
    type: MealType;
    label: string;
    mealName: string;
    estimatedCalories: number;
    protein: number;
    carbs: number;
    fats: number;
    items: {
      name: string;
      portion: string;
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
    }[];
    recipeInstructions?: string;
  }[];
  prepTips: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
