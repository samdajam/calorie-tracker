import React from 'react';
import {
  Utensils,
  Sparkles,
  Calculator,
  ShoppingBag,
  Droplet,
  RotateCcw,
  Camera,
  TrendingUp,
  Database,
  Loader2,
  LayoutDashboard,
} from 'lucide-react';

interface NavbarProps {
  calorieTarget: number;
  totalCaloriesConsumed: number;
  waterConsumed: number;
  waterTarget: number;
  syncStatus: 'synced' | 'saving' | 'offline';
  activeView: 'planner' | 'analytics';
  onChangeView: (view: 'planner' | 'analytics') => void;
  onOpenAiPlanner: () => void;
  onOpenPhotoLogger: () => void;
  onOpenTdeeCalculator: () => void;
  onOpenGroceryList: () => void;
  onOpenSupabaseConfig: () => void;
  onAddWater: () => void;
  onResetPlan: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  calorieTarget,
  totalCaloriesConsumed,
  waterConsumed,
  waterTarget,
  syncStatus,
  activeView,
  onChangeView,
  onOpenAiPlanner,
  onOpenPhotoLogger,
  onOpenTdeeCalculator,
  onOpenGroceryList,
  onOpenSupabaseConfig,
  onAddWater,
  onResetPlan,
}) => {
  const caloriesLeft = calorieTarget - totalCaloriesConsumed;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          
          {/* Brand & Supabase Sync Button */}
          <div className="flex items-center space-x-3">
            <div
              onClick={() => onChangeView('planner')}
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/25 cursor-pointer hover:scale-105 transition-transform"
            >
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onChangeView('planner')}
                  className="text-xl font-extrabold tracking-tight text-slate-900 hover:opacity-90 transition-opacity"
                >
                  Nutri<span className="text-emerald-600">Plan</span>
                </button>
                {/* Interactive Supabase Status Pill */}
                <button
                  onClick={onOpenSupabaseConfig}
                  className="inline-flex items-center text-[10px] font-semibold rounded-full transition-all hover:opacity-80"
                  title="Click to configure Supabase PostgreSQL database connection"
                >
                  {syncStatus === 'synced' && (
                    <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-emerald-800 bg-emerald-50 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Supabase Synced</span>
                    </span>
                  )}
                  {syncStatus === 'saving' && (
                    <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-amber-800 bg-amber-50 border border-amber-200">
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-600" />
                      <span>Syncing DB...</span>
                    </span>
                  )}
                  {syncStatus === 'offline' && (
                    <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200">
                      <Database className="w-2.5 h-2.5 text-emerald-600" />
                      <span>Connect Supabase</span>
                    </span>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 hidden xl:block">
                AI Vision Meal Logger &amp; Supabase PostgreSQL Tracker
              </p>
            </div>
          </div>

          {/* Center Segmented View Switcher (Daily Planner vs 7-Day Analytics) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => onChangeView('planner')}
              className={`flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeView === 'planner'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className={`w-3.5 h-3.5 ${activeView === 'planner' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Daily Planner</span>
            </button>

            <button
              onClick={() => onChangeView('analytics')}
              className={`flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeView === 'analytics'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className={`w-3.5 h-3.5 ${activeView === 'analytics' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>7-Day Analytics</span>
            </button>
          </div>

          {/* Right Quick Actions & Highlighted Scan Meal CTA */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            
            {/* Quick Remaining & Water Pill on Large Screens */}
            <div className="hidden lg:flex items-center space-x-3 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200/80 mr-1">
              <div className="text-left">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Remaining</span>
                <span className={`text-xs font-extrabold ${caloriesLeft < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {caloriesLeft.toLocaleString()} kcal
                </span>
              </div>

              <div className="h-5 w-px bg-slate-200" />

              <button
                onClick={onAddWater}
                title="Click to log +1 cup of water"
                className="flex items-center space-x-1 text-xs font-bold text-sky-700 bg-sky-100/80 hover:bg-sky-200/80 px-2 py-1 rounded-xl transition-colors"
              >
                <Droplet className="w-3 h-3 text-sky-600 fill-sky-600" />
                <span>{waterConsumed}/{waterTarget}</span>
                <span className="text-sky-500">+</span>
              </button>
            </div>

            {/* Highlighted Primary Action: SCAN MEAL */}
            <button
              onClick={onOpenPhotoLogger}
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center space-x-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 ring-2 ring-emerald-500/20"
              title="Take a photo or upload a meal/receipt for instant AI calorie detection"
            >
              <Camera className="w-4 h-4 text-white" />
              <span>Scan Meal</span>
            </button>

            {/* AI Meal Plan Generator */}
            <button
              onClick={onOpenAiPlanner}
              className="px-2.5 sm:px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-xs flex items-center space-x-1.5 transition-all"
              title="Generate a full day's meal plan with AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
              <span className="hidden md:inline">AI Plan</span>
            </button>

            {/* Supabase DB Config Button */}
            <button
              onClick={onOpenSupabaseConfig}
              className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors border border-transparent hover:border-emerald-200"
              title="Supabase Database Settings"
            >
              <Database className="w-4 h-4" />
            </button>

            {/* TDEE Calculator */}
            <button
              onClick={onOpenTdeeCalculator}
              className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors border border-transparent hover:border-emerald-200"
              title="TDEE & Macro Target Calculator"
            >
              <Calculator className="w-4 h-4" />
            </button>

            {/* Grocery List */}
            <button
              onClick={onOpenGroceryList}
              className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors border border-transparent hover:border-emerald-200"
              title="View Auto-Compiled Grocery List"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>

            {/* Reset Day */}
            <button
              onClick={onResetPlan}
              title="Reset day's meals to balanced 1,800 kcal sample"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors hidden sm:inline-flex"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
