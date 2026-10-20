import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { DailyTargets, MealSlot } from '../types';
import { Flame, Dumbbell, Wheat, Droplets, Droplet, Plus, Minus, Sliders, TrendingUp } from 'lucide-react';

interface DailySummaryProps {
  targets: DailyTargets;
  meals: Record<string, MealSlot>;
  waterConsumed: number;
  onUpdateWater: (val: number) => void;
  onOpenTdeeModal: () => void;
  onOpenAnalytics?: () => void;
}

export const DailySummary: React.FC<DailySummaryProps> = ({
  targets,
  meals,
  waterConsumed,
  onUpdateWater,
  onOpenTdeeModal,
  onOpenAnalytics,
}) => {
  // Compute totals
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;

  const mealBarData: { name: string; calories: number }[] = [];

  Object.values(meals).forEach((meal) => {
    let mealCal = 0;
    meal.items.forEach((item) => {
      totalCalories += item.calories;
      totalProtein += item.protein;
      totalCarbs += item.carbs;
      totalFats += item.fats;
      mealCal += item.calories;
    });
    mealBarData.push({
      name: meal.label.replace('Morning Snack', 'AM Snack').replace('Afternoon Snack', 'PM Snack'),
      calories: mealCal,
    });
  });

  // Percentages of target
  const calPercent = Math.min(100, Math.round((totalCalories / (targets.calories || 1)) * 100));
  const proteinPercent = Math.min(100, Math.round((totalProtein / (targets.protein || 1)) * 100));
  const carbsPercent = Math.min(100, Math.round((totalCarbs / (targets.carbs || 1)) * 100));
  const fatsPercent = Math.min(100, Math.round((totalFats / (targets.fats || 1)) * 100));

  // Pie chart macro distribution
  const macroPieData = [
    { name: 'Protein', value: totalProtein * 4, grams: totalProtein, color: '#10b981' }, // 4 kcal/g
    { name: 'Carbs', value: totalCarbs * 4, grams: totalCarbs, color: '#f59e0b' },     // 4 kcal/g
    { name: 'Fats', value: totalFats * 9, grams: totalFats, color: '#ec4899' },        // 9 kcal/g
  ];

  const remainingCal = targets.calories - totalCalories;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200/90 mb-8">
      {/* Title & Action Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Daily Nutrition &amp; Macro Balance
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {calPercent}% of Daily Goal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time calorie budget, macronutrient breakdown, and hydration progress
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {onOpenAnalytics && (
            <button
              onClick={onOpenAnalytics}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-colors border border-slate-200/80"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>7-Day Trends</span>
            </button>
          )}
          <button
            onClick={onOpenTdeeModal}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors border border-emerald-200"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Targets ({targets.calories} kcal)</span>
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pt-5">
        
        {/* Calorie Progress Card */}
        <div className="relative flex flex-col justify-between p-5 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-2xl border border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center space-x-1">
              <Flame className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              <span>Calories</span>
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
              remainingCal >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
            }`}>
              {remainingCal >= 0 ? `${remainingCal} left` : `${Math.abs(remainingCal)} over`}
            </span>
          </div>

          <div className="my-1.5">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-extrabold text-slate-900">{totalCalories.toLocaleString()}</span>
              <span className="text-xs font-semibold text-slate-500">/ {targets.calories.toLocaleString()} kcal</span>
            </div>
            
            <div className="w-full bg-slate-200 rounded-full h-2.5 mt-3 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  calPercent > 100 ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                }`}
                style={{ width: `${Math.min(100, calPercent)}%` }}
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium pt-2 flex justify-between">
            <span>{calPercent}% consumed</span>
            <span>Goal: {targets.calories}</span>
          </div>
        </div>

        {/* Protein Macro */}
        <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center space-x-1">
              <Dumbbell className="w-4 h-4 text-emerald-600" />
              <span>Protein</span>
            </span>
            <span className="text-xs font-bold text-slate-600">{proteinPercent}%</span>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-slate-900">{totalProtein}g</span>
                <span className="text-xs text-slate-500">/ {targets.protein}g</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700">
                {Math.max(0, targets.protein - totalProtein)}g to go
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2.5">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${proteinPercent}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Muscle retention &amp; satiety</p>
        </div>

        {/* Carbs Macro */}
        <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center space-x-1">
              <Wheat className="w-4 h-4 text-amber-500" />
              <span>Carbs</span>
            </span>
            <span className="text-xs font-bold text-slate-600">{carbsPercent}%</span>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-slate-900">{totalCarbs}g</span>
                <span className="text-xs text-slate-500">/ {targets.carbs}g</span>
              </div>
              <span className="text-[11px] font-semibold text-amber-700">
                {Math.max(0, targets.carbs - totalCarbs)}g left
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2.5">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${carbsPercent}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Primary energy &amp; glycogen</p>
        </div>

        {/* Fats Macro */}
        <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-pink-700 flex items-center space-x-1">
              <Droplets className="w-4 h-4 text-pink-500" />
              <span>Healthy Fats</span>
            </span>
            <span className="text-xs font-bold text-slate-600">{fatsPercent}%</span>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-slate-900">{totalFats}g</span>
                <span className="text-xs text-slate-500">/ {targets.fats}g</span>
              </div>
              <span className="text-[11px] font-semibold text-pink-700">
                {Math.max(0, targets.fats - totalFats)}g left
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2.5">
              <div
                className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${fatsPercent}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Hormones &amp; nutrient absorption</p>
        </div>

      </div>

      {/* Visual Analytics & Water Intake Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5 pt-5 border-t border-slate-100">
        
        {/* Macro Distribution Donut */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 flex flex-col">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
            Macro Caloric Split
          </span>
          <div className="h-32 flex items-center justify-center">
            {totalCalories > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macroPieData}
                    innerRadius={34}
                    outerRadius={52}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {macroPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => [
                      `${item.payload.grams}g (${Math.round(Number(value))} kcal)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-slate-400">Scan or log a meal to see chart</span>
            )}
          </div>
          <div className="flex justify-around text-center text-xs pt-1">
            <span className="text-emerald-700 font-semibold">P: {totalProtein}g</span>
            <span className="text-amber-700 font-semibold">C: {totalCarbs}g</span>
            <span className="text-pink-700 font-semibold">F: {totalFats}g</span>
          </div>
        </div>

        {/* Meal-by-Meal Calorie Bar Chart */}
        <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 flex flex-col">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
            Calories by Meal Slot
          </span>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mealBarData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: any) => [`${val} kcal`, 'Calories']}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                />
                <Bar dataKey="calories" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Water Tracker */}
        <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-sky-800 uppercase tracking-wider flex items-center space-x-1">
                <Droplet className="w-4 h-4 text-sky-600 fill-sky-600" />
                <span>Hydration Tracker</span>
              </span>
              <span className="text-xs font-bold text-sky-700">
                {waterConsumed * 250} ml / {targets.waterGlasses * 250} ml
              </span>
            </div>
            
            <p className="text-[11px] text-sky-600 mb-2.5">
              Tap glasses to log water ({targets.waterGlasses} cups daily target)
            </p>

            {/* Glasses visualization */}
            <div className="flex flex-wrap gap-1.5 py-1">
              {Array.from({ length: targets.waterGlasses }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => onUpdateWater(i + 1 === waterConsumed ? i : i + 1)}
                  className={`w-7 h-8 rounded-lg border flex items-center justify-center transition-all ${
                    i < waterConsumed
                      ? 'bg-sky-500 border-sky-600 text-white shadow-xs'
                      : 'bg-white border-sky-200 text-sky-300 hover:border-sky-400'
                  }`}
                  title={`Glass #${i + 1}`}
                >
                  <Droplet className={`w-3.5 h-3.5 ${i < waterConsumed ? 'fill-white' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-sky-100 mt-2">
            <span className="text-[11px] font-medium text-sky-700">
              {waterConsumed >= targets.waterGlasses ? 'Hydration goal complete!' : `${targets.waterGlasses - waterConsumed} cups remaining`}
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => onUpdateWater(Math.max(0, waterConsumed - 1))}
                className="p-1 rounded-lg bg-white border border-sky-200 text-sky-700 hover:bg-sky-100"
                title="Remove glass"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-sky-900 px-1">{waterConsumed}</span>
              <button
                onClick={() => onUpdateWater(waterConsumed + 1)}
                className="p-1 rounded-lg bg-sky-600 text-white hover:bg-sky-700 shadow-xs"
                title="Add glass"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
