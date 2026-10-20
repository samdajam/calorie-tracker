import React, { useState } from 'react';
import { MealSlot, FoodItem, MealType } from '../types';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Sparkles,
  Loader2,
  Apple,
  Camera,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import { estimateFoodItemNutrition } from '../services/geminiService';

interface MealSectionProps {
  slot: MealSlot;
  onAddItem: (item: Omit<FoodItem, 'id'>) => void;
  onRemoveItem: (id: string) => void;
  onToggleItem: (id: string) => void;
  onOpenPhotoLoggerForSlot: (slotType: MealType) => void;
}

// 1-Click Quick Add Presets per meal slot for frictionless logging
const QUICK_PRESETS: Record<MealType, Omit<FoodItem, 'id'>[]> = {
  breakfast: [
    { name: '2 Scrambled Eggs', portion: '2 large', calories: 140, protein: 12, carbs: 1, fats: 10 },
    { name: 'Protein Oatmeal', portion: '1 bowl', calories: 270, protein: 25, carbs: 32, fats: 4 },
    { name: 'Avocado Sourdough Toast', portion: '1 slice', calories: 210, protein: 5, carbs: 22, fats: 11 },
    { name: 'Black Coffee / Espresso', portion: '1 cup', calories: 5, protein: 0, carbs: 1, fats: 0 },
  ],
  morningSnack: [
    { name: 'Greek Yogurt (Non-Fat)', portion: '3/4 cup', calories: 100, protein: 17, carbs: 6, fats: 0 },
    { name: 'Whey Protein Shake', portion: '1 scoop', calories: 120, protein: 24, carbs: 3, fats: 1.5 },
    { name: 'Medium Banana', portion: '1 medium', calories: 105, protein: 1.3, carbs: 27, fats: 0.4 },
    { name: 'Raw Almonds', portion: '1 oz (23)', calories: 160, protein: 6, carbs: 6, fats: 14 },
  ],
  lunch: [
    { name: 'Grilled Chicken Breast', portion: '5 oz', calories: 230, protein: 43, carbs: 0, fats: 5 },
    { name: 'Cooked Quinoa / Brown Rice', portion: '1/2 cup', calories: 110, protein: 4, carbs: 21, fats: 1.5 },
    { name: 'Tuna Salad Wrap', portion: '1 wrap', calories: 320, protein: 28, carbs: 26, fats: 10 },
    { name: 'Mixed Green Side Salad', portion: '2 cups', calories: 70, protein: 2, carbs: 8, fats: 4 },
  ],
  afternoonSnack: [
    { name: 'Cottage Cheese (Low-Fat)', portion: '1/2 cup', calories: 90, protein: 13, carbs: 5, fats: 2.5 },
    { name: 'Hard-Boiled Egg', portion: '1 large', calories: 70, protein: 6, carbs: 0.5, fats: 5 },
    { name: 'Apple & Peanut Butter', portion: '1 apple + 1 tbsp', calories: 190, protein: 4, carbs: 28, fats: 8 },
    { name: 'Hummus & Veggie Sticks', portion: '1/4 cup + 1 cup', calories: 150, protein: 4, carbs: 16, fats: 8 },
  ],
  dinner: [
    { name: 'Baked Salmon Fillet', portion: '5 oz', calories: 280, protein: 32, carbs: 0, fats: 16 },
    { name: 'Lean Ground Turkey Stir-Fry', portion: '5 oz', calories: 250, protein: 34, carbs: 6, fats: 10 },
    { name: 'Roasted Sweet Potato', portion: '1 medium', calories: 115, protein: 2, carbs: 27, fats: 0.2 },
    { name: 'Steamed Broccoli & Olive Oil', portion: '1.5 cups', calories: 115, protein: 4, carbs: 9, fats: 7 },
  ],
};

export const MealSection: React.FC<MealSectionProps> = ({
  slot,
  onAddItem,
  onRemoveItem,
  onToggleItem,
  onOpenPhotoLoggerForSlot,
}) => {
  const [quickInput, setQuickInput] = useState('');
  const [isAiEstimating, setIsAiEstimating] = useState(false);

  // Manual fallback inputs
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPortion, setManualPortion] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFats, setManualFats] = useState('');

  // Calculate slot totals
  const totalCalories = slot.items.reduce((acc, i) => acc + i.calories, 0);
  const totalProtein = slot.items.reduce((acc, i) => acc + i.protein, 0);
  const totalCarbs = slot.items.reduce((acc, i) => acc + i.carbs, 0);
  const totalFats = slot.items.reduce((acc, i) => acc + i.fats, 0);

  const handleAiAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    setIsAiEstimating(true);
    try {
      const estimated = await estimateFoodItemNutrition(quickInput.trim());
      onAddItem(estimated);
      setQuickInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiEstimating(false);
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    onAddItem({
      name: manualName.trim(),
      portion: manualPortion.trim() || '1 serving',
      calories: Number(manualCalories) || 0,
      protein: Number(manualProtein) || 0,
      carbs: Number(manualCarbs) || 0,
      fats: Number(manualFats) || 0,
    });

    setManualName('');
    setManualPortion('');
    setManualCalories('');
    setManualProtein('');
    setManualCarbs('');
    setManualFats('');
    setShowManualForm(false);
  };

  // Meal slot badge styling
  const slotColorMap: Record<MealType, string> = {
    breakfast: 'bg-amber-100 text-amber-800 border-amber-200',
    morningSnack: 'bg-teal-100 text-teal-800 border-teal-200',
    lunch: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    afternoonSnack: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    dinner: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  const presets = QUICK_PRESETS[slot.type] || [];

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300">
      
      <div>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-slate-100 gap-2">
          <div className="flex items-center space-x-2.5">
            <span className={`text-xs font-extrabold px-3 py-1 rounded-xl border ${slotColorMap[slot.type]}`}>
              {slot.label}
            </span>
            <span className="text-base sm:text-lg font-extrabold text-slate-900">{totalCalories} kcal</span>
          </div>

          {/* Macros summary & prominent Scan Meal button */}
          <div className="flex items-center space-x-2 text-xs font-medium text-slate-500">
            <div className="hidden sm:flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
              <span className="text-emerald-700 font-bold">{totalProtein}g P</span>
              <span className="text-slate-300">•</span>
              <span className="text-amber-700 font-bold">{totalCarbs}g C</span>
              <span className="text-slate-300">•</span>
              <span className="text-pink-700 font-bold">{totalFats}g F</span>
            </div>
            
            {/* Highlighted Scan Meal Button for this specific slot */}
            <button
              onClick={() => onOpenPhotoLoggerForSlot(slot.type)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs"
              title={`Snap or upload a photo to log into ${slot.label}`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan {slot.label}</span>
            </button>
          </div>
        </div>

        {/* Always-Visible Smart Quick-Log Input Bar */}
        <div className="mt-3.5">
          {!showManualForm ? (
            <form onSubmit={handleAiAdd} className="space-y-2">
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={quickInput}
                    onChange={(e) => setQuickInput(e.target.value)}
                    placeholder={`Type food for ${slot.label.toLowerCase()} (e.g. "2 eggs & toast")...`}
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50/80 focus:bg-white transition-all"
                    disabled={isAiEstimating}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAiEstimating || !quickInput.trim()}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center space-x-1 transition-all flex-shrink-0"
                >
                  {isAiEstimating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Logging...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualForm(true)}
                  title="Enter exact calories & macros manually"
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200/80 transition-colors flex-shrink-0"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 1-Click Quick-Add Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                <span className="text-[10px] font-bold text-slate-400 flex items-center flex-shrink-0">
                  <Zap className="w-2.5 h-2.5 mr-0.5 text-amber-500" />
                  Quick:
                </span>
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onAddItem(preset)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 border border-slate-200/70 hover:border-emerald-200 transition-colors whitespace-nowrap flex-shrink-0"
                    title={`Add ${preset.name} (${preset.calories} kcal, ${preset.protein}g P)`}
                  >
                    + {preset.name} ({preset.calories})
                  </button>
                ))}
              </div>
            </form>
          ) : (
            /* Manual Exact Macro Form */
            <form onSubmit={handleManualAdd} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">Manual Macro Entry</span>
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className="text-[11px] text-emerald-700 font-semibold hover:underline"
                >
                  Switch to AI Smart Input
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Food Name *"
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <input
                    type="text"
                    value={manualPortion}
                    onChange={(e) => setManualPortion(e.target.value)}
                    placeholder="Portion (100g)"
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(e.target.value)}
                    placeholder="kcal *"
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    required
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={manualProtein}
                    onChange={(e) => setManualProtein(e.target.value)}
                    placeholder="Prot (g)"
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={manualCarbs}
                    onChange={(e) => setManualCarbs(e.target.value)}
                    placeholder="Carb (g)"
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                >
                  Add Food
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Logged Food Items List */}
        <div className="mt-3 divide-y divide-slate-100">
          {slot.items.length === 0 ? (
            <div className="py-5 text-center text-slate-400 text-xs">
              <Apple className="w-5 h-5 mx-auto mb-1 text-slate-300" />
              No items logged for {slot.label.toLowerCase()} yet. Use the input above or click <strong>Scan {slot.label}</strong>.
            </div>
          ) : (
            slot.items.map((item) => (
              <div
                key={item.id}
                className={`py-2.5 flex items-center justify-between group transition-colors ${
                  item.checked ? 'opacity-60 line-through' : ''
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 pr-3">
                  <button
                    onClick={() => onToggleItem(item.id)}
                    className="text-slate-400 hover:text-emerald-600 transition-colors flex-shrink-0"
                    title="Mark as eaten"
                  >
                    {item.checked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {item.portion} • <span className="text-emerald-700 font-medium">P: {item.protein}g</span> | C: {item.carbs}g | F: {item.fats}g
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 flex-shrink-0">
                  <span className="text-xs sm:text-sm font-bold text-slate-700">{item.calories} kcal</span>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-slate-300 hover:text-rose-500 opacity-70 group-hover:opacity-100 transition-opacity p-1"
                    title="Remove food"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {slot.notes && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 italic">
          Prep tip: {slot.notes}
        </div>
      )}

    </div>
  );
};
