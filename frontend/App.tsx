import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DailyPlanState, MealType, FoodItem, GeneratedMealPlanResponse, DailyTargets, DaySummaryInfo } from './types';
import { Navbar } from './components/Navbar';
import { DailySummary } from './components/DailySummary';
import { MealSection } from './components/MealSection';
import { PlanGeneratorModal } from './components/PlanGeneratorModal';
import { AICoachChat } from './components/AICoachChat';
import { GroceryListModal } from './components/GroceryListModal';
import { TdeeCalculatorModal } from './components/TdeeCalculatorModal';
import { PhotoLogModal } from './components/PhotoLogModal';
import { DatePickerModal } from './components/DatePickerModal';
import { WeeklyTrendsModal } from './components/WeeklyTrendsModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import {
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChefHat,
  Camera,
  Copy,
  CalendarDays,
  Calculator,
  ShoppingBag,
  Loader2,
  Plus,
  Database,
} from 'lucide-react';
import {
  getSupabaseConfig,
  initSupabaseSession,
  subscribeToSupabaseDailyPlans,
  saveDailyPlanToSupabase,
  saveMultiplePlansToSupabase,
} from './services/supabaseService';
import { estimateFoodItemNutrition } from './services/geminiService';

// Default initial targets
const DEFAULT_TARGETS: DailyTargets = {
  calories: 1800,
  protein: 135,
  carbs: 160,
  fats: 65,
  waterGlasses: 8,
};

// Formats a 'YYYY-MM-DD' date into 'Weekday, Mon Day'
function formatDisplayDate(dateIso: string): string {
  try {
    const parts = dateIso.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }
  } catch (e) {
    console.error(e);
  }
  return dateIso;
}

// Get today's ISO date string 'YYYY-MM-DD'
function getTodayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Compute shift of days (+1 or -1) from an ISO string
function shiftDateIso(dateIso: string, deltaDays: number): string {
  const parts = dateIso.split('-');
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setDate(d.getDate() + deltaDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Create a blank day plan structure
function createEmptyDayPlan(dateIso: string, targets: DailyTargets = DEFAULT_TARGETS): DailyPlanState {
  return {
    dateIso,
    date: formatDisplayDate(dateIso),
    targets,
    waterConsumed: 0,
    meals: {
      breakfast: {
        type: 'breakfast',
        label: 'Breakfast',
        recommendedCalRatio: 0.25,
        items: [],
      },
      morningSnack: {
        type: 'morningSnack',
        label: 'Morning Snack',
        recommendedCalRatio: 0.12,
        items: [],
      },
      lunch: {
        type: 'lunch',
        label: 'Lunch',
        recommendedCalRatio: 0.28,
        items: [],
      },
      afternoonSnack: {
        type: 'afternoonSnack',
        label: 'Afternoon Snack',
        recommendedCalRatio: 0.12,
        items: [],
      },
      dinner: {
        type: 'dinner',
        label: 'Dinner',
        recommendedCalRatio: 0.23,
        items: [],
      },
    },
  };
}

// Sample 1,800 blueprint for initial demo
function createSampleBlueprint(dateIso: string, modifier = 1.0): DailyPlanState {
  const calFactor = modifier;
  return {
    dateIso,
    date: formatDisplayDate(dateIso),
    targets: { ...DEFAULT_TARGETS },
    waterConsumed: Math.round(6 * calFactor),
    meals: {
      breakfast: {
        type: 'breakfast',
        label: 'Breakfast',
        recommendedCalRatio: 0.25,
        items: [
          { id: 'b1', name: 'Rolled Oats (cooked in water)', portion: '1/2 cup', calories: Math.round(150 * calFactor), protein: 5, carbs: 27, fats: 3, checked: true },
          { id: 'b2', name: 'Vanilla Whey Protein Powder', portion: '1 scoop (30g)', calories: Math.round(120 * calFactor), protein: 24, carbs: 2, fats: 1.5, checked: true },
          { id: 'b3', name: 'Mixed Fresh Berries', portion: '1/2 cup', calories: Math.round(40 * calFactor), protein: 1, carbs: 9, fats: 0.5, checked: true },
          { id: 'b4', name: 'Chia Seeds', portion: '1 tbsp', calories: Math.round(60 * calFactor), protein: 2, carbs: 5, fats: 4, checked: true },
        ],
      },
      morningSnack: {
        type: 'morningSnack',
        label: 'Morning Snack',
        recommendedCalRatio: 0.12,
        items: [
          { id: 'ms1', name: 'Non-Fat Greek Yogurt (Plain)', portion: '3/4 cup', calories: Math.round(100 * calFactor), protein: 17, carbs: 6, fats: 0, checked: true },
          { id: 'ms2', name: 'Crisp Apple (sliced)', portion: '1 medium', calories: Math.round(95 * calFactor), protein: 0.5, carbs: 25, fats: 0.3, checked: true },
        ],
      },
      lunch: {
        type: 'lunch',
        label: 'Lunch',
        recommendedCalRatio: 0.28,
        items: [
          { id: 'l1', name: 'Grilled Herb Chicken Breast', portion: '4 oz (115g)', calories: Math.round(180 * calFactor), protein: 35, carbs: 0, fats: 4, checked: true },
          { id: 'l2', name: 'Mediterranean Mixed Greens & Tomato', portion: '2 cups', calories: Math.round(50 * calFactor), protein: 2, carbs: 8, fats: 0.5, checked: true },
          { id: 'l3', name: 'Cooked Quinoa', portion: '1/2 cup', calories: Math.round(110 * calFactor), protein: 4, carbs: 20, fats: 2, checked: true },
          { id: 'l4', name: 'Crumbled Feta Cheese', portion: '1 tbsp', calories: Math.round(40 * calFactor), protein: 2, carbs: 1, fats: 3.5, checked: true },
          { id: 'l5', name: 'Extra Virgin Olive Oil & Lemon', portion: '1 tsp', calories: Math.round(40 * calFactor), protein: 0, carbs: 0, fats: 4.5, checked: true },
        ],
      },
      afternoonSnack: {
        type: 'afternoonSnack',
        label: 'Afternoon Snack',
        recommendedCalRatio: 0.12,
        items: [
          { id: 'as1', name: 'Sliced Bell Peppers & Carrots', portion: '1 cup', calories: Math.round(50 * calFactor), protein: 1.5, carbs: 10, fats: 0.5, checked: false },
          { id: 'as2', name: 'Avocado Guacamole / Hummus', portion: '1/4 cup', calories: Math.round(100 * calFactor), protein: 2, carbs: 6, fats: 8, checked: false },
          { id: 'as3', name: 'Hard-Boiled Egg', portion: '1 large', calories: Math.round(70 * calFactor), protein: 6, carbs: 0.5, fats: 5, checked: false },
        ],
      },
      dinner: {
        type: 'dinner',
        label: 'Dinner',
        recommendedCalRatio: 0.23,
        items: [
          { id: 'd1', name: 'Baked Atlantic Salmon Fillet', portion: '5 oz (140g)', calories: Math.round(280 * calFactor), protein: 32, carbs: 0, fats: 16, checked: false },
          { id: 'd2', name: 'Baked Sweet Potato with Cinnamon', portion: '1 medium', calories: Math.round(115 * calFactor), protein: 2, carbs: 27, fats: 0.2, checked: false },
          { id: 'd3', name: 'Roasted Broccoli & Asparagus', portion: '1.5 cups', calories: Math.round(55 * calFactor), protein: 4, carbs: 9, fats: 0.5, checked: false },
          { id: 'd4', name: 'Cooking Olive Oil (cooking spray/brush)', portion: '1 tbsp', calories: Math.round(120 * calFactor), protein: 0, carbs: 0, fats: 14, checked: false },
        ],
      },
    },
  };
}

export default function App() {
  const todayIso = getTodayIso();
  const [selectedDateIso, setSelectedDateIso] = useState<string>(todayIso);
  const [activeView, setActiveView] = useState<'planner' | 'analytics'>('planner');
  const [userId, setUserId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('offline');
  const [supabaseReconnectTrigger, setSupabaseReconnectTrigger] = useState(0);

  // Top-level Quick Bar state
  const [globalQuickFood, setGlobalQuickFood] = useState('');
  const [globalQuickSlot, setGlobalQuickSlot] = useState<MealType>('lunch');
  const [isGlobalEstimating, setIsGlobalEstimating] = useState(false);

  // Multi-day storage dictionary: key is dateIso
  const [plansByDate, setPlansByDate] = useState<Record<string, DailyPlanState>>(() => {
    try {
      const saved = localStorage.getItem('nutriplan_plans_by_date');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }

    const initialDict: Record<string, DailyPlanState> = {};
    const multipliers = [0.95, 1.05, 0.98, 1.15, 0.92, 1.0, 1.0];
    for (let i = 6; i >= 0; i--) {
      const iso = shiftDateIso(todayIso, -i);
      const factor = multipliers[6 - i];
      initialDict[iso] = createSampleBlueprint(iso, factor);
    }
    return initialDict;
  });

  // Current selected day's plan
  const currentPlan: DailyPlanState =
    plansByDate[selectedDateIso] ||
    createEmptyDayPlan(
      selectedDateIso,
      plansByDate[todayIso]?.targets || DEFAULT_TARGETS
    );

  // 1. Establish Supabase Session & Sync with `daily_plans` table
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = initSupabaseSession((user) => {
      setUserId(user.uid);

      const hasSupabaseCreds = Boolean(getSupabaseConfig());
      if (!hasSupabaseCreds) {
        setSyncStatus('offline');
        return;
      }

      setSyncStatus('saving');

      unsubscribeSnapshot = subscribeToSupabaseDailyPlans(
        user.uid,
        (supabasePlans) => {
          if (Object.keys(supabasePlans).length > 0) {
            setPlansByDate((prev) => {
              const merged = { ...prev, ...supabasePlans };
              localStorage.setItem('nutriplan_plans_by_date', JSON.stringify(merged));
              return merged;
            });
          } else {
            // Seed initial local plans into Supabase table
            saveMultiplePlansToSupabase(user.uid, plansByDate).catch((err) =>
              console.warn('Initial Supabase seed warning:', err)
            );
          }
          setSyncStatus('synced');
        },
        (error) => {
          console.warn('Supabase listener offline or unconfigured:', error.message);
          setSyncStatus('offline');
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseReconnectTrigger]);

  // Save to localStorage as quick local backup
  useEffect(() => {
    localStorage.setItem('nutriplan_plans_by_date', JSON.stringify(plansByDate));
  }, [plansByDate]);

  // Modals state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isTdeeModalOpen, setIsTdeeModalOpen] = useState(false);
  const [isGroceryModalOpen, setIsGroceryModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [photoTargetSlot, setPhotoTargetSlot] = useState<MealType>('lunch');

  // Total calories consumed on the current selected day
  const totalCalories = Object.values(currentPlan.meals).reduce(
    (total, slot) => total + slot.items.reduce((acc, item) => acc + item.calories, 0),
    0
  );

  // Count total logged food items on current day
  const totalItemCount = Object.values(currentPlan.meals).reduce(
    (acc, slot) => acc + slot.items.length,
    0
  );

  // Create summary map for the calendar & week strip
  const daySummaries: Record<string, DaySummaryInfo> = useMemo(() => {
    const map: Record<string, DaySummaryInfo> = {};
    Object.entries(plansByDate).forEach(([dateIso, plan]) => {
      const cal = Object.values(plan.meals).reduce(
        (sum, slot) => sum + slot.items.reduce((acc, i) => acc + i.calories, 0),
        0
      );
      const count = Object.values(plan.meals).reduce((sum, slot) => sum + slot.items.length, 0);
      map[dateIso] = {
        dateIso,
        totalCalories: cal,
        itemCount: count,
      };
    });
    return map;
  }, [plansByDate]);

  // Generate 7-Day Horizontal Strip centered around selectedDateIso
  const weekStripDays = useMemo(() => {
    const strip = [];
    for (let offset = -3; offset <= 3; offset++) {
      const iso = shiftDateIso(selectedDateIso, offset);
      const parts = iso.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const cal = daySummaries[iso]?.totalCalories || 0;
      strip.push({
        iso,
        dayName,
        dayNum,
        calories: cal,
        isToday: iso === todayIso,
        isSelected: iso === selectedDateIso,
      });
    }
    return strip;
  }, [selectedDateIso, daySummaries, todayIso]);

  // Helper to update current day's plan and sync automatically to Supabase database
  const updateCurrentPlan = useCallback((updater: (prev: DailyPlanState) => DailyPlanState) => {
    setPlansByDate((prev) => {
      const existing = prev[selectedDateIso] || createEmptyDayPlan(selectedDateIso, prev[todayIso]?.targets);
      const updatedPlan = updater(existing);

      if (userId && getSupabaseConfig()) {
        setSyncStatus('saving');
        saveDailyPlanToSupabase(userId, updatedPlan)
          .then(() => setSyncStatus('synced'))
          .catch((err) => {
            console.error('Error saving plan to Supabase:', err);
            setSyncStatus('offline');
          });
      }

      return {
        ...prev,
        [selectedDateIso]: updatedPlan,
      };
    });
  }, [selectedDateIso, todayIso, userId]);

  // Seed 7-day realistic demo data and save to Supabase
  const handleSeedSampleWeek = () => {
    const updated = { ...plansByDate };
    const factors = [0.94, 1.08, 0.95, 1.18, 0.92, 1.02, 1.0];
    for (let i = 6; i >= 0; i--) {
      const iso = shiftDateIso(selectedDateIso, -i);
      updated[iso] = createSampleBlueprint(iso, factors[6 - i]);
    }
    setPlansByDate(updated);
    if (userId && getSupabaseConfig()) {
      setSyncStatus('saving');
      saveMultiplePlansToSupabase(userId, updated)
        .then(() => setSyncStatus('synced'))
        .catch((e) => {
          console.error(e);
          setSyncStatus('offline');
        });
    }
  };

  // Item management
  const handleAddItem = (slotType: MealType, item: Omit<FoodItem, 'id'>) => {
    const newItem: FoodItem = {
      ...item,
      id: `${slotType}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      checked: false,
    };

    updateCurrentPlan((plan) => ({
      ...plan,
      meals: {
        ...plan.meals,
        [slotType]: {
          ...plan.meals[slotType],
          items: [...plan.meals[slotType].items, newItem],
        },
      },
    }));
  };

  const handleGlobalQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalQuickFood.trim() || isGlobalEstimating) return;
    setIsGlobalEstimating(true);
    try {
      const estimated = await estimateFoodItemNutrition(globalQuickFood.trim());
      handleAddItem(globalQuickSlot, estimated);
      setGlobalQuickFood('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsGlobalEstimating(false);
    }
  };

  const handleAddMultipleItems = (slotType: MealType, items: Omit<FoodItem, 'id'>[]) => {
    const newItems: FoodItem[] = items.map((item, idx) => ({
      ...item,
      id: `${slotType}_photo_${Date.now()}_${idx}`,
      checked: false,
    }));

    updateCurrentPlan((plan) => ({
      ...plan,
      meals: {
        ...plan.meals,
        [slotType]: {
          ...plan.meals[slotType],
          items: [...plan.meals[slotType].items, ...newItems],
        },
      },
    }));
  };

  const handleRemoveItem = (slotType: MealType, id: string) => {
    updateCurrentPlan((plan) => ({
      ...plan,
      meals: {
        ...plan.meals,
        [slotType]: {
          ...plan.meals[slotType],
          items: plan.meals[slotType].items.filter((item) => item.id !== id),
        },
      },
    }));
  };

  const handleToggleItem = (slotType: MealType, id: string) => {
    updateCurrentPlan((plan) => ({
      ...plan,
      meals: {
        ...plan.meals,
        [slotType]: {
          ...plan.meals[slotType],
          items: plan.meals[slotType].items.map((item) =>
            item.id === id ? { ...item, checked: !item.checked } : item
          ),
        },
      },
    }));
  };

  const handleUpdateWater = (val: number) => {
    updateCurrentPlan((plan) => ({
      ...plan,
      waterConsumed: Math.max(0, val),
    }));
  };

  const handleUpdateTargets = (newTargets: DailyTargets) => {
    updateCurrentPlan((plan) => ({
      ...plan,
      targets: newTargets,
    }));
  };

  // Open photo logger specifically targeting a chosen meal slot
  const handleOpenPhotoLoggerForSlot = (slotType: MealType) => {
    setPhotoTargetSlot(slotType);
    setIsPhotoModalOpen(true);
  };

  // Copy meals from previous day
  const handleCopyFromPreviousDay = () => {
    const prevDateIso = shiftDateIso(selectedDateIso, -1);
    const prevPlan = plansByDate[prevDateIso];

    if (!prevPlan || Object.values(prevPlan.meals).every((m) => m.items.length === 0)) {
      alert(`No meals were logged on ${formatDisplayDate(prevDateIso)} to copy.`);
      return;
    }

    if (
      totalItemCount > 0 &&
      !window.confirm(`Replace meals for ${currentPlan.date} with meals from ${prevPlan.date}?`)
    ) {
      return;
    }

    const copiedMeals = { ...prevPlan.meals };
    const clonedMeals: Record<MealType, typeof prevPlan.meals.breakfast> = {} as any;

    (Object.keys(copiedMeals) as MealType[]).forEach((key) => {
      clonedMeals[key] = {
        ...copiedMeals[key],
        items: copiedMeals[key].items.map((item, idx) => ({
          ...item,
          id: `${key}_copied_${Date.now()}_${idx}`,
          checked: false,
        })),
      };
    });

    updateCurrentPlan((plan) => ({
      ...plan,
      targets: { ...prevPlan.targets },
      meals: clonedMeals,
    }));
  };

  // Apply Generated Meal Plan from Gemini
  const handleApplyAiPlan = (aiPlan: GeneratedMealPlanResponse) => {
    const updatedMeals = { ...currentPlan.meals };

    aiPlan.meals.forEach((genMeal) => {
      const type = genMeal.type as MealType;
      if (updatedMeals[type]) {
        updatedMeals[type] = {
          ...updatedMeals[type],
          notes: genMeal.recipeInstructions || '',
          items: genMeal.items.map((item, idx) => ({
            id: `gen_${type}_${idx}_${Date.now()}`,
            name: item.name,
            portion: item.portion,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fats: item.fats,
            checked: false,
          })),
        };
      }
    });

    updateCurrentPlan((plan) => ({
      ...plan,
      targets: {
        ...plan.targets,
        calories: aiPlan.targets.calories,
        protein: aiPlan.targets.protein,
        carbs: aiPlan.targets.carbs,
        fats: aiPlan.targets.fats,
      },
      meals: updatedMeals,
    }));
  };

  const handleResetToSample = () => {
    if (window.confirm(`Reset ${currentPlan.date}'s meals to the 1,800 kcal balanced blueprint?`)) {
      updateCurrentPlan(() => createSampleBlueprint(selectedDateIso));
    }
  };

  const handleClearDay = () => {
    if (window.confirm(`Clear all logged food items for ${currentPlan.date}?`)) {
      updateCurrentPlan((plan) => createEmptyDayPlan(selectedDateIso, plan.targets));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        calorieTarget={currentPlan.targets.calories}
        totalCaloriesConsumed={totalCalories}
        waterConsumed={currentPlan.waterConsumed}
        waterTarget={currentPlan.targets.waterGlasses}
        syncStatus={syncStatus}
        activeView={activeView}
        onChangeView={setActiveView}
        onOpenAiPlanner={() => setIsAiModalOpen(true)}
        onOpenPhotoLogger={() => {
          setPhotoTargetSlot('lunch');
          setIsPhotoModalOpen(true);
        }}
        onOpenTdeeCalculator={() => setIsTdeeModalOpen(true)}
        onOpenGroceryList={() => setIsGroceryModalOpen(true)}
        onOpenSupabaseConfig={() => setIsSupabaseModalOpen(true)}
        onAddWater={() => handleUpdateWater(currentPlan.waterConsumed + 1)}
        onResetPlan={handleResetToSample}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Interactive 7-Day Date Strip & Calendar Bar */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Left: Selected Date Title + Full Calendar Trigger */}
            <div className="flex items-center justify-between lg:justify-start space-x-3">
              <button
                onClick={() => setIsDatePickerOpen(true)}
                className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl border border-emerald-200 transition-colors flex items-center justify-center"
                title="Open full monthly calendar"
              >
                <Calendar className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsDatePickerOpen(true)}
                    className="text-lg sm:text-xl font-black text-slate-900 hover:text-emerald-700 transition-colors flex items-center space-x-1.5"
                  >
                    <span>{currentPlan.date}</span>
                  </button>
                  {selectedDateIso !== todayIso && (
                    <button
                      onClick={() => setSelectedDateIso(todayIso)}
                      className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
                    >
                      Return to Today
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {totalItemCount} {totalItemCount === 1 ? 'food item' : 'food items'} logged • {totalCalories.toLocaleString()} / {currentPlan.targets.calories.toLocaleString()} kcal
                </p>
              </div>
            </div>

            {/* Center: Interactive 7-Day Horizontal Scroller */}
            <div className="flex items-center space-x-1.5 overflow-x-auto py-1 no-scrollbar">
              <button
                onClick={() => setSelectedDateIso(shiftDateIso(selectedDateIso, -1))}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
                title="Previous day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {weekStripDays.map((d) => (
                <button
                  key={d.iso}
                  onClick={() => setSelectedDateIso(d.iso)}
                  className={`min-w-[60px] sm:min-w-[68px] py-2 px-2 rounded-2xl flex flex-col items-center justify-center transition-all border flex-shrink-0 ${
                    d.isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/25 scale-105'
                      : d.isToday
                      ? 'bg-emerald-50/90 text-emerald-900 border-emerald-300 font-bold'
                      : 'bg-slate-50/80 text-slate-600 border-slate-200/70 hover:bg-slate-100'
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase ${d.isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                    {d.dayName}
                  </span>
                  <span className="text-sm font-extrabold leading-tight my-0.5">{d.dayNum}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                      d.isSelected
                        ? 'bg-white/20 text-white'
                        : d.calories > 0
                        ? 'text-emerald-700 bg-emerald-100/70'
                        : 'text-slate-400'
                    }`}
                  >
                    {d.calories > 0 ? `${d.calories}` : '—'}
                  </span>
                </button>
              ))}

              <button
                onClick={() => setSelectedDateIso(shiftDateIso(selectedDateIso, 1))}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
                title="Next day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Utility Buttons */}
            <div className="flex items-center space-x-2 self-end lg:self-auto">
              <button
                onClick={() => setIsDatePickerOpen(true)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center space-x-1.5"
              >
                <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                <span>Month View</span>
              </button>
              <button
                onClick={handleCopyFromPreviousDay}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center space-x-1.5"
                title="Copy yesterday's logged meals into this day"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Prev Day</span>
              </button>
            </div>

          </div>
        </div>

        {/* View Switcher: Either Daily Planner View OR Full 7-Day Analytics View */}
        {activeView === 'analytics' ? (
          <WeeklyTrendsModal
            isOpen={true}
            isEmbedded={true}
            onClose={() => setActiveView('planner')}
            selectedDateIso={selectedDateIso}
            onSelectDate={(iso) => {
              setSelectedDateIso(iso);
              setActiveView('planner');
            }}
            plansByDate={plansByDate}
            defaultTargets={DEFAULT_TARGETS}
            onSeedSampleWeek={handleSeedSampleWeek}
          />
        ) : (
          <>
            {/* HERO SPOTLIGHT: SCAN MEAL & INSTANT AI QUICK LOG */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8">
              
              {/* Highlighted Feature: Scan Meal with Gemini Vision */}
              <div className="lg:col-span-7 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-emerald-900/15 relative overflow-hidden flex flex-col justify-between">
                <div className="relative z-10">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-[11px] font-bold uppercase tracking-wider mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                    <span>Featured • Gemini 2.5 Vision</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                    Snap a Photo to Log Your Meal Instantly
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl">
                    Point your camera at any plate, bowl, nutrition label, or grocery receipt. AI automatically detects dishes, estimates portion sizes, and logs exact macros.
                  </p>
                </div>

                <div className="relative z-10 flex flex-wrap items-center gap-2.5 mt-5 pt-4 border-t border-white/10">
                  <button
                    onClick={() => {
                      setPhotoTargetSlot('lunch');
                      setIsPhotoModalOpen(true);
                    }}
                    className="px-5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-950 rounded-2xl font-extrabold text-xs sm:text-sm shadow-md flex items-center space-x-2 transition-all transform hover:scale-[1.02] active:scale-95"
                  >
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Scan Meal or Receipt</span>
                  </button>

                  {/* Direct slot scan shortcuts */}
                  <div className="flex items-center space-x-1.5 text-xs">
                    <span className="text-emerald-200/80 text-[11px] font-medium hidden sm:inline">Quick scan for:</span>
                    {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((slot) => (
                      <button
                        key={slot}
                        onClick={() => handleOpenPhotoLoggerForSlot(slot)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px] capitalize transition-colors border border-white/10"
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Global AI Natural Language Quick-Log & Tool Dock */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Instant AI Food Log</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Auto-calculates macros</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Describe what you ate in plain English and add it to any meal slot:
                  </p>

                  <form onSubmit={handleGlobalQuickLog} className="space-y-2.5">
                    <div className="flex gap-2">
                      <select
                        value={globalQuickSlot}
                        onChange={(e) => setGlobalQuickSlot(e.target.value as MealType)}
                        className="text-xs font-bold px-2.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="breakfast">Breakfast</option>
                        <option value="morningSnack">AM Snack</option>
                        <option value="lunch">Lunch</option>
                        <option value="afternoonSnack">PM Snack</option>
                        <option value="dinner">Dinner</option>
                      </select>
                      <input
                        type="text"
                        value={globalQuickFood}
                        onChange={(e) => setGlobalQuickFood(e.target.value)}
                        placeholder="e.g. Grilled chicken burrito bowl..."
                        className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        disabled={isGlobalEstimating}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isGlobalEstimating || !globalQuickFood.trim()}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all"
                    >
                      {isGlobalEstimating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Estimating Nutrition...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Estimate &amp; Add to {globalQuickSlot.replace('Snack', ' Snack')}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Quick Access Tool Dock */}
                <div className="grid grid-cols-4 gap-2 pt-4 mt-4 border-t border-slate-100">
                  <button
                    onClick={() => setIsAiModalOpen(true)}
                    className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex flex-col items-center justify-center space-y-1 transition-colors border border-emerald-200/60"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>AI Plan</span>
                  </button>
                  <button
                    onClick={() => setIsTdeeModalOpen(true)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] flex flex-col items-center justify-center space-y-1 transition-colors border border-slate-200/60"
                  >
                    <Calculator className="w-4 h-4 text-teal-600" />
                    <span>TDEE</span>
                  </button>
                  <button
                    onClick={() => setIsGroceryModalOpen(true)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] flex flex-col items-center justify-center space-y-1 transition-colors border border-slate-200/60"
                  >
                    <ShoppingBag className="w-4 h-4 text-amber-600" />
                    <span>Groceries</span>
                  </button>
                  <button
                    onClick={() => setIsSupabaseModalOpen(true)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold text-[11px] flex flex-col items-center justify-center space-y-1 transition-colors border border-slate-200/60"
                  >
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span>Supabase</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Nutrition Gauge & Analytics Summary */}
            <DailySummary
              targets={currentPlan.targets}
              meals={currentPlan.meals}
              waterConsumed={currentPlan.waterConsumed}
              onUpdateWater={handleUpdateWater}
              onOpenTdeeModal={() => setIsTdeeModalOpen(true)}
              onOpenAnalytics={() => setActiveView('analytics')}
            />

            {/* Meals Grid */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
                  <ChefHat className="w-5 h-5 text-emerald-600" />
                  <span>Meals &amp; Snacks ({currentPlan.date})</span>
                </h3>
                
                <div className="flex items-center space-x-3">
                  {totalItemCount > 0 && (
                    <button
                      onClick={handleClearDay}
                      className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      Clear day
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MealSection
                  slot={currentPlan.meals.breakfast}
                  onAddItem={(item) => handleAddItem('breakfast', item)}
                  onRemoveItem={(id) => handleRemoveItem('breakfast', id)}
                  onToggleItem={(id) => handleToggleItem('breakfast', id)}
                  onOpenPhotoLoggerForSlot={handleOpenPhotoLoggerForSlot}
                />

                <MealSection
                  slot={currentPlan.meals.morningSnack}
                  onAddItem={(item) => handleAddItem('morningSnack', item)}
                  onRemoveItem={(id) => handleRemoveItem('morningSnack', id)}
                  onToggleItem={(id) => handleToggleItem('morningSnack', id)}
                  onOpenPhotoLoggerForSlot={handleOpenPhotoLoggerForSlot}
                />

                <MealSection
                  slot={currentPlan.meals.lunch}
                  onAddItem={(item) => handleAddItem('lunch', item)}
                  onRemoveItem={(id) => handleRemoveItem('lunch', id)}
                  onToggleItem={(id) => handleToggleItem('lunch', id)}
                  onOpenPhotoLoggerForSlot={handleOpenPhotoLoggerForSlot}
                />

                <MealSection
                  slot={currentPlan.meals.afternoonSnack}
                  onAddItem={(item) => handleAddItem('afternoonSnack', item)}
                  onRemoveItem={(id) => handleRemoveItem('afternoonSnack', id)}
                  onToggleItem={(id) => handleToggleItem('afternoonSnack', id)}
                  onOpenPhotoLoggerForSlot={handleOpenPhotoLoggerForSlot}
                />

                <div className="md:col-span-2">
                  <MealSection
                    slot={currentPlan.meals.dinner}
                    onAddItem={(item) => handleAddItem('dinner', item)}
                    onRemoveItem={(id) => handleRemoveItem('dinner', id)}
                    onToggleItem={(id) => handleToggleItem('dinner', id)}
                    onOpenPhotoLoggerForSlot={handleOpenPhotoLoggerForSlot}
                  />
                </div>
              </div>
            </div>
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-400">
        <p>NutriPlan • Powered by Supabase PostgreSQL &amp; Google Gemini 2.5 Flash Vision</p>
      </footer>

      {/* Supabase Database Configuration Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        userId={userId}
        plansByDate={plansByDate}
        onImportPlans={(imported) => {
          setPlansByDate((prev) => {
            const merged = { ...prev, ...imported };
            if (userId && getSupabaseConfig()) {
              setSyncStatus('saving');
              saveMultiplePlansToSupabase(userId, merged)
                .then(() => setSyncStatus('synced'))
                .catch(() => setSyncStatus('offline'));
            }
            return merged;
          });
        }}
        onConfigSaved={() => {
          setSupabaseReconnectTrigger((prev) => prev + 1);
          if (userId && getSupabaseConfig()) {
            setSyncStatus('saving');
            saveMultiplePlansToSupabase(userId, plansByDate)
              .then(() => setSyncStatus('synced'))
              .catch(() => setSyncStatus('offline'));
          }
        }}
      />

      {/* Interactive Calendar Date Picker Modal */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        selectedDateIso={selectedDateIso}
        onSelectDate={(iso) => setSelectedDateIso(iso)}
        daySummaries={daySummaries}
      />

      {/* Floating AI Nutritionist Chat */}
      <AICoachChat planState={currentPlan} />

      {/* Gemini Vision Photo Logger Modal */}
      <PhotoLogModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        defaultMealSlot={photoTargetSlot}
        onLogItems={handleAddMultipleItems}
      />

      {/* AI Plan Generator Modal */}
      <PlanGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        currentTarget={currentPlan.targets.calories}
        onApplyPlan={handleApplyAiPlan}
      />

      {/* TDEE / Calorie Goal Calculator Modal */}
      <TdeeCalculatorModal
        isOpen={isTdeeModalOpen}
        onClose={() => setIsTdeeModalOpen(false)}
        currentTargets={currentPlan.targets}
        onUpdateTargets={handleUpdateTargets}
      />

      {/* Auto-compiled Grocery List Modal */}
      <GroceryListModal
        isOpen={isGroceryModalOpen}
        onClose={() => setIsGroceryModalOpen(false)}
        meals={currentPlan.meals}
      />

    </div>
  );
}
