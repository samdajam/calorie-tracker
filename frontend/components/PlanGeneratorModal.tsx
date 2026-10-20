import React, { useState } from 'react';
import { X, Sparkles, Loader2, Check, RefreshCw, ChevronRight } from 'lucide-react';
import { generateDailyMealPlan } from '../services/geminiService';
import { GeneratedMealPlanResponse } from '../types';

interface PlanGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTarget: number;
  onApplyPlan: (plan: GeneratedMealPlanResponse) => void;
}

export const PlanGeneratorModal: React.FC<PlanGeneratorModalProps> = ({
  isOpen,
  onClose,
  currentTarget,
  onApplyPlan,
}) => {
  const [calorieTarget, setCalorieTarget] = useState<number>(currentTarget || 1800);
  const [dietPreference, setDietPreference] = useState('High Protein / Balanced');
  const [goal, setGoal] = useState('Fat Loss & Lean Muscle');
  const [allergies, setAllergies] = useState('');
  const [customRequests, setCustomRequests] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedMealPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const plan = await generateDailyMealPlan({
        calorieTarget,
        dietPreference,
        goal,
        allergies,
        customRequests,
      });
      setGeneratedPlan(plan);
    } catch (err: any) {
      console.error(err);
      setError('Failed to generate meal plan. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (generatedPlan) {
      onApplyPlan(generatedPlan);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <Sparkles className="w-6 h-6 text-yellow-300 fill-yellow-300" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">AI Meal Plan Generator</h3>
            <p className="text-xs sm:text-sm text-slate-500">Design a scientific, nutrient-matched day of eating</p>
          </div>
        </div>

        {!generatedPlan ? (
          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Calorie Target with Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Daily Calories: <span className="text-emerald-600 font-extrabold">{calorieTarget} kcal</span>
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="1200"
                  max="3500"
                  step="50"
                  value={calorieTarget}
                  onChange={(e) => setCalorieTarget(Number(e.target.value))}
                  className="flex-1 accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  value={calorieTarget}
                  onChange={(e) => setCalorieTarget(Number(e.target.value))}
                  className="w-24 text-center font-bold text-sm px-2 py-1.5 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[1500, 1800, 2000, 2200, 2500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCalorieTarget(preset)}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                      calorieTarget === preset
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset} cal
                  </button>
                ))}
              </div>
            </div>

            {/* Dietary Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Dietary Style
                </label>
                <select
                  value={dietPreference}
                  onChange={(e) => setDietPreference(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="High Protein / Balanced">High Protein & Whole Foods</option>
                  <option value="Mediterranean Diet">Mediterranean Diet</option>
                  <option value="Vegetarian">Vegetarian (Plant-Forward)</option>
                  <option value="Vegan">100% Plant-Based (Vegan)</option>
                  <option value="Low Carb / Keto">Low Carb / Keto</option>
                  <option value="Paleo Whole30">Paleo / Clean Eating</option>
                  <option value="Gluten-Free Clean">Gluten-Free</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Fitness Objective
                </label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Fat Loss & Lean Muscle">Fat Loss & Satiety</option>
                  <option value="Muscle Hypertrophy">Muscle Gain & Recovery</option>
                  <option value="Weight Maintenance">Healthy Maintenance & Energy</option>
                  <option value="Athletic Endurance">High Performance Endurance</option>
                </select>
              </div>
            </div>

            {/* Allergies / Exclusions */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Allergies or Disliked Foods
              </label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. No dairy, hate seafood, peanut allergy"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Custom Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Preferences (Optional)
              </label>
              <input
                type="text"
                value={customRequests}
                onChange={(e) => setCustomRequests(e.target.value)}
                placeholder="e.g. Quick prep under 20 mins, budget friendly"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-medium border border-rose-200">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>Gemini is generating your personalized meal plan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                    <span>Generate Complete Daily Plan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Plan Preview */
          <div className="space-y-5">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Plan Overview</span>
                <span className="text-xs font-black text-emerald-900">{generatedPlan.targets.calories} kcal</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-800 font-medium">{generatedPlan.summary}</p>
              
              <div className="flex gap-4 mt-2 pt-2 border-t border-emerald-200/60 text-xs font-semibold text-emerald-900">
                <span>Protein: {generatedPlan.targets.protein}g</span>
                <span>Carbs: {generatedPlan.targets.carbs}g</span>
                <span>Fats: {generatedPlan.targets.fats}g</span>
              </div>
            </div>

            {/* Meals Preview */}
            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {generatedPlan.meals.map((meal, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800">{meal.label}: {meal.mealName}</span>
                    <span className="text-xs font-extrabold text-emerald-700">{meal.estimatedCalories} cal</span>
                  </div>
                  <ul className="text-xs text-slate-600 list-disc list-inside space-y-0.5">
                    {meal.items.map((item, i) => (
                      <li key={i}>
                        {item.name} ({item.portion}) - <span className="text-slate-400">{item.calories} kcal</span>
                      </li>
                    ))}
                  </ul>
                  {meal.recipeInstructions && (
                    <p className="text-[11px] text-slate-500 italic mt-1.5 pt-1 border-t border-slate-200/50">
                      Tip: {meal.recipeInstructions}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setGeneratedPlan(null)}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Adjust Settings</span>
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/30 inline-flex items-center space-x-2 transition-all transform active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Apply to Today's Tracker</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
