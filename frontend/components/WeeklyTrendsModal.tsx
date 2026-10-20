import React, { useState, useMemo } from 'react';
import {
  X,
  TrendingUp,
  Flame,
  Dumbbell,
  Wheat,
  Droplets,
  Droplet,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { DailyPlanState, DailyTargets, WeeklyTrendDayData, WeeklySummaryMetrics } from '../types';
import { analyzeWeeklyTrendsReport } from '../services/geminiService';

interface WeeklyTrendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDateIso: string;
  onSelectDate: (dateIso: string) => void;
  plansByDate: Record<string, DailyPlanState>;
  defaultTargets: DailyTargets;
  onSeedSampleWeek?: () => void;
  isEmbedded?: boolean;
}

export const WeeklyTrendsModal: React.FC<WeeklyTrendsModalProps> = ({
  isOpen,
  onClose,
  selectedDateIso,
  onSelectDate,
  plansByDate,
  defaultTargets,
  onSeedSampleWeek,
  isEmbedded = false,
}) => {
  const [activeTab, setActiveTab] = useState<'calories' | 'macros' | 'hydration'>('calories');
  const [aiReport, setAiReport] = useState<{
    adherenceVerdict: string;
    calorieInsights: string;
    proteinInsights: string;
    actionableRecommendations: string[];
  } | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Compute 7-day window ending on selectedDateIso
  const { weekDays, metrics } = useMemo(() => {
    const days: WeeklyTrendDayData[] = [];
    const baseDate = new Date(selectedDateIso + 'T00:00:00');
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const iso = `${year}-${month}-${day}`;

      const dayPlan = plansByDate[iso];
      const dayTargets = dayPlan?.targets || defaultTargets;

      let cConsumed = 0;
      let pConsumed = 0;
      let cbConsumed = 0;
      let fConsumed = 0;
      let itemCount = 0;

      if (dayPlan) {
        Object.values(dayPlan.meals).forEach((slot) => {
          slot.items.forEach((item) => {
            cConsumed += item.calories;
            pConsumed += item.protein;
            cbConsumed += item.carbs;
            fConsumed += item.fats;
            itemCount++;
          });
        });
      }

      const waterConsumed = dayPlan ? dayPlan.waterConsumed : 0;
      const calorieDelta = cConsumed - dayTargets.calories;
      const margin = dayTargets.calories * 0.1; // 10% target margin

      let status: 'on-target' | 'surplus' | 'deficit' | 'unlogged' = 'unlogged';
      if (itemCount > 0) {
        if (Math.abs(calorieDelta) <= margin) {
          status = 'on-target';
        } else if (calorieDelta > margin) {
          status = 'surplus';
        } else {
          status = 'deficit';
        }
      }

      days.push({
        dateIso: iso,
        dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
        shortDate: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
        isToday: iso === new Date().toISOString().split('T')[0],
        caloriesConsumed: cConsumed,
        caloriesTarget: dayTargets.calories,
        proteinConsumed: pConsumed,
        proteinTarget: dayTargets.protein,
        carbsConsumed: cbConsumed,
        carbsTarget: dayTargets.carbs,
        fatsConsumed: fConsumed,
        fatsTarget: dayTargets.fats,
        waterConsumed,
        waterTarget: dayTargets.waterGlasses,
        itemCount,
        calorieDelta,
        status,
      });
    }

    // Compute summary averages
    const loggedDays = days.filter((d) => d.itemCount > 0);
    const count = loggedDays.length || 1;

    const avgCalories = Math.round(days.reduce((acc, d) => acc + d.caloriesConsumed, 0) / count);
    const avgProtein = Math.round(days.reduce((acc, d) => acc + d.proteinConsumed, 0) / count);
    const avgCarbs = Math.round(days.reduce((acc, d) => acc + d.carbsConsumed, 0) / count);
    const avgFats = Math.round(days.reduce((acc, d) => acc + d.fatsConsumed, 0) / count);
    const avgWater = Number((days.reduce((acc, d) => acc + d.waterConsumed, 0) / 7).toFixed(1));

    const daysOnTarget = days.filter((d) => d.status === 'on-target').length;
    const surplusDaysCount = days.filter((d) => d.status === 'surplus').length;
    const deficitDaysCount = days.filter((d) => d.status === 'deficit').length;
    const proteinDeficitDaysCount = days.filter(
      (d) => d.itemCount > 0 && d.proteinConsumed < d.proteinTarget * 0.85
    ).length;

    const summaryMetrics: WeeklySummaryMetrics = {
      avgCalories,
      avgProtein,
      avgCarbs,
      avgFats,
      avgWater,
      daysLogged: loggedDays.length,
      daysOnTarget,
      surplusDaysCount,
      deficitDaysCount,
      proteinDeficitDaysCount,
    };

    return { weekDays: days, metrics: summaryMetrics };
  }, [selectedDateIso, plansByDate, defaultTargets]);

  const handleGenerateAiReport = async () => {
    setIsGeneratingAi(true);
    try {
      const report = await analyzeWeeklyTrendsReport(weekDays, metrics);
      setAiReport(report);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  if (!isOpen && !isEmbedded) return null;

  const startDateLabel = weekDays[0]?.shortDate || '';
  const endDateLabel = weekDays[6]?.shortDate || '';
  const targetCalorieBenchmark = defaultTargets.calories;

  // Custom tooltips
  const CustomCalorieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: WeeklyTrendDayData = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1">
          <p className="font-bold text-slate-200">
            {data.dayLabel} ({data.shortDate})
          </p>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Consumed:</span>
            <span className="font-bold text-emerald-400">{data.caloriesConsumed} kcal</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Target:</span>
            <span className="font-bold text-slate-300">{data.caloriesTarget} kcal</span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-slate-700">
            <span className="text-slate-400">Difference:</span>
            <span
              className={`font-bold ${
                data.calorieDelta > 0 ? 'text-rose-400' : 'text-sky-300'
              }`}
            >
              {data.calorieDelta > 0 ? `+${data.calorieDelta}` : data.calorieDelta} kcal
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const contentBody = (
    <div className={isEmbedded ? 'bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200/90 space-y-6' : 'bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative my-6 max-h-[92vh] flex flex-col'}>
      
      {/* Close Button (Modal only) */}
      {!isEmbedded && (
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                7-Day Nutrition &amp; Adherence Analytics
              </h3>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {startDateLabel} – {endDateLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Target vs. consumed comparison, macro averages, and surplus/deficit insights
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isEmbedded && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Planner</span>
            </button>
          )}
          {metrics.daysLogged < 3 && onSeedSampleWeek && (
            <button
              onClick={onSeedSampleWeek}
              className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
              title="Populate past week with realistic sample data"
            >
              Seed Sample Week
            </button>
          )}
          <button
            onClick={handleGenerateAiReport}
            disabled={isGeneratingAi}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all"
          >
            {isGeneratingAi ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                <span>AI Dietitian Review</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={isEmbedded ? 'space-y-6' : 'flex-1 overflow-y-auto pr-1 space-y-6 pt-4'}>
        
        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Avg Calories */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center space-x-1">
              <Flame className="w-3.5 h-3.5 text-emerald-600" />
              <span>Avg Calories</span>
            </span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-xl font-black text-slate-900">{metrics.avgCalories}</span>
              <span className="text-[10px] text-slate-500 font-semibold">/ {targetCalorieBenchmark} kcal</span>
            </div>
            <span className={`text-[10px] font-bold block mt-0.5 ${
              Math.abs(metrics.avgCalories - targetCalorieBenchmark) <= 100
                ? 'text-emerald-700'
                : metrics.avgCalories > targetCalorieBenchmark
                ? 'text-rose-600'
                : 'text-amber-600'
            }`}>
              {metrics.avgCalories >= targetCalorieBenchmark
                ? `+${metrics.avgCalories - targetCalorieBenchmark} kcal vs goal`
                : `-${targetCalorieBenchmark - metrics.avgCalories} kcal vs goal`}
            </span>
          </div>

          {/* Avg Protein */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center space-x-1">
              <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
              <span>Avg Protein</span>
            </span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-xl font-black text-slate-900">{metrics.avgProtein}g</span>
              <span className="text-[10px] text-slate-500 font-semibold">/ {defaultTargets.protein}g</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {Math.round((metrics.avgProtein / defaultTargets.protein) * 100)}% of daily target
            </span>
          </div>

          {/* Avg Carbs */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center space-x-1">
              <Wheat className="w-3.5 h-3.5 text-amber-500" />
              <span>Avg Carbs</span>
            </span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-xl font-black text-slate-900">{metrics.avgCarbs}g</span>
              <span className="text-[10px] text-slate-500 font-semibold">/ {defaultTargets.carbs}g</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {Math.round((metrics.avgCarbs / defaultTargets.carbs) * 100)}% of daily target
            </span>
          </div>

          {/* Avg Fats */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-pink-700 flex items-center space-x-1">
              <Droplets className="w-3.5 h-3.5 text-pink-500" />
              <span>Avg Fats</span>
            </span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-xl font-black text-slate-900">{metrics.avgFats}g</span>
              <span className="text-[10px] text-slate-500 font-semibold">/ {defaultTargets.fats}g</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {Math.round((metrics.avgFats / defaultTargets.fats) * 100)}% of daily target
            </span>
          </div>

          {/* Avg Water */}
          <div className="p-3.5 bg-sky-50/70 border border-sky-100 rounded-2xl col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 flex items-center space-x-1">
              <Droplet className="w-3.5 h-3.5 text-sky-600" />
              <span>Avg Hydration</span>
            </span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-xl font-black text-slate-900">{metrics.avgWater}</span>
              <span className="text-[10px] text-slate-500 font-semibold">/ 8 cups</span>
            </div>
            <span className="text-[10px] text-sky-700 block mt-0.5">
              {Math.round(metrics.avgWater * 250)} ml / day
            </span>
          </div>
        </div>

        {/* Key Insight Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl border bg-rose-50/60 border-rose-200/80">
            <div className="flex items-center space-x-2 text-rose-800 font-bold text-xs mb-1">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Calorie Surpluses ({metrics.surplusDaysCount} days)</span>
            </div>
            <p className="text-xs text-rose-900/80">
              {metrics.surplusDaysCount === 0
                ? 'No calorie surplus spikes detected this week. Excellent portion control!'
                : `${metrics.surplusDaysCount} day(s) exceeded target by >10%. Check weekend meals or restaurant logging.`}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl border bg-amber-50/60 border-amber-200/80">
            <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs mb-1">
              <Dumbbell className="w-4 h-4 text-amber-600" />
              <span>Protein Watch ({metrics.proteinDeficitDaysCount} days low)</span>
            </div>
            <p className="text-xs text-amber-900/80">
              {metrics.proteinDeficitDaysCount === 0
                ? 'Protein goal hit consistently every logged day! Muscle synthesis is optimized.'
                : `${metrics.proteinDeficitDaysCount} day(s) were under 85% of protein goal. Try adding high-protein afternoon snacks.`}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl border bg-emerald-50/60 border-emerald-200/80">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Target Adherence ({metrics.daysOnTarget}/7 days)</span>
            </div>
            <p className="text-xs text-emerald-900/80">
              {metrics.daysOnTarget >= 5
                ? 'Outstanding consistency! Staying within ±10% for 5+ days guarantees goal achievement.'
                : `${metrics.daysOnTarget} days hit the sweet spot. Planning ahead with the AI Generator helps smooth variance.`}
            </p>
          </div>
        </div>

        {/* AI Dietitian Critique Card */}
        {aiReport && (
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl border border-emerald-200 shadow-xs space-y-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-700 fill-emerald-100" />
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                AI Nutritionist Weekly Verdict
              </h4>
            </div>

            <p className="text-xs sm:text-sm font-semibold text-emerald-950">
              {aiReport.adherenceVerdict}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 pt-1">
              <div className="p-2.5 bg-white/70 rounded-xl border border-emerald-100">
                <span className="font-bold text-emerald-900 block mb-0.5">Calorie Adherence</span>
                <p>{aiReport.calorieInsights}</p>
              </div>
              <div className="p-2.5 bg-white/70 rounded-xl border border-emerald-100">
                <span className="font-bold text-emerald-900 block mb-0.5">Protein &amp; Macro Quality</span>
                <p>{aiReport.proteinInsights}</p>
              </div>
            </div>

            {aiReport.actionableRecommendations?.length > 0 && (
              <div className="pt-2 border-t border-emerald-200/60">
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block mb-1">
                  Action Plan for Next Week:
                </span>
                <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                  {aiReport.actionableRecommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Chart View Switcher */}
        <div className="bg-slate-50/60 rounded-2xl border border-slate-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/70 gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                {activeTab === 'calories' && 'Daily Calories: Consumed vs. Target'}
                {activeTab === 'macros' && 'Daily Macronutrient Trends (Grams)'}
                {activeTab === 'hydration' && 'Daily Hydration Intake (Glasses vs. 8 Goal)'}
              </h4>
              <p className="text-xs text-slate-500">
                Click any date row below to inspect or edit that day's meals
              </p>
            </div>

            <div className="flex bg-slate-200/70 p-1 rounded-xl gap-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('calories')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'calories'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Calories
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('macros')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'macros'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Macros
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('hydration')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'hydration'
                    ? 'bg-white text-sky-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hydration
              </button>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-4">
            {activeTab === 'calories' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekDays} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 'dataMax + 400']} />
                  <Tooltip content={<CustomCalorieTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <ReferenceLine
                    y={targetCalorieBenchmark}
                    label={{
                      value: `Target (${targetCalorieBenchmark})`,
                      fill: '#10b981',
                      fontSize: 10,
                      position: 'top',
                    }}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                  />
                  <Bar
                    dataKey="caloriesConsumed"
                    name="Consumed (kcal)"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeTab === 'macros' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekDays} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val}g`, name]}
                    contentStyle={{ fontSize: '12px', borderRadius: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="proteinConsumed" name="Protein (g)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="carbsConsumed" name="Carbs (g)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="fatsConsumed" name="Fats (g)" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeTab === 'hydration' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekDays} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 12]} />
                  <Tooltip
                    formatter={(val: any) => [`${val} cups (${Number(val) * 250} ml)`, 'Hydration']}
                    contentStyle={{ fontSize: '12px', borderRadius: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <ReferenceLine
                    y={defaultTargets.waterGlasses}
                    label={{
                      value: `Goal (${defaultTargets.waterGlasses} cups)`,
                      fill: '#0284c7',
                      fontSize: 10,
                      position: 'top',
                    }}
                    stroke="#0284c7"
                    strokeDasharray="4 4"
                  />
                  <Bar dataKey="waterConsumed" name="Water (Glasses)" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 7-Day Detailed Breakdown Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            7-Day Day-by-Day Log
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2 px-2">Date</th>
                  <th className="py-2 px-2">Calories</th>
                  <th className="py-2 px-2">Delta</th>
                  <th className="py-2 px-2">Protein</th>
                  <th className="py-2 px-2">Carbs</th>
                  <th className="py-2 px-2">Fats</th>
                  <th className="py-2 px-2">Water</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {weekDays.map((d) => {
                  const isSelected = d.dateIso === selectedDateIso;
                  return (
                    <tr
                      key={d.dateIso}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      <td className="py-2.5 px-2 font-bold text-slate-900">
                        {d.dayLabel}, {d.shortDate}
                        {d.isToday && (
                          <span className="ml-1 text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                            Today
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-bold text-slate-800">
                        {d.caloriesConsumed > 0 ? `${d.caloriesConsumed} kcal` : '—'}
                      </td>
                      <td className="py-2.5 px-2">
                        {d.caloriesConsumed > 0 ? (
                          <span
                            className={`font-semibold ${
                              d.calorieDelta > 0 ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {d.calorieDelta > 0 ? `+${d.calorieDelta}` : d.calorieDelta} kcal
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={d.proteinConsumed < d.proteinTarget * 0.85 && d.itemCount > 0 ? 'text-amber-700 font-bold' : ''}>
                          {d.proteinConsumed}g
                        </span>
                      </td>
                      <td className="py-2.5 px-2">{d.carbsConsumed}g</td>
                      <td className="py-2.5 px-2">{d.fatsConsumed}g</td>
                      <td className="py-2.5 px-2 font-semibold text-sky-700">
                        {d.waterConsumed} / {d.waterTarget} cups
                      </td>
                      <td className="py-2.5 px-2">
                        {d.status === 'on-target' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            On Target
                          </span>
                        )}
                        {d.status === 'surplus' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                            Surplus
                          </span>
                        )}
                        {d.status === 'deficit' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                            Deficit
                          </span>
                        )}
                        {d.status === 'unlogged' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                            No meals
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <button
                          onClick={() => {
                            onSelectDate(d.dateIso);
                            onClose();
                          }}
                          className="text-xs font-bold text-emerald-700 hover:underline"
                        >
                          View Day
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );

  if (isEmbedded) {
    return contentBody;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-sm overflow-y-auto">
      {contentBody}
    </div>
  );
};
