import React, { useState } from 'react';
import { X, Calculator, Check, ArrowRight } from 'lucide-react';
import { DailyTargets } from '../types';

interface TdeeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTargets: DailyTargets;
  onUpdateTargets: (newTargets: DailyTargets) => void;
}

export const TdeeCalculatorModal: React.FC<TdeeCalculatorModalProps> = ({
  isOpen,
  onClose,
  currentTargets,
  onUpdateTargets,
}) => {
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [age, setAge] = useState<number>(28);
  const [weightKg, setWeightKg] = useState<number>(68);
  const [heightCm, setHeightCm] = useState<number>(170);
  const [activityLevel, setActivityLevel] = useState<number>(1.375); // light exercise
  const [fitnessGoal, setFitnessGoal] = useState<'loss' | 'maintain' | 'gain'>('loss');

  if (!isOpen) return null;

  // Mifflin - St Jeor Equation
  // Male: BMR = 10W + 6.25H - 5A + 5
  // Female: BMR = 10W + 6.25H - 5A - 161
  const bmr =
    gender === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = Math.round(bmr * activityLevel);

  let targetCal = tdee;
  if (fitnessGoal === 'loss') targetCal = Math.round(tdee - 450); // ~0.5kg/week fat loss
  if (fitnessGoal === 'gain') targetCal = Math.round(tdee + 350); // lean surplus

  // Standard recommended high-protein macro split:
  // Protein: ~2.0g per kg of bodyweight
  const calculatedProtein = Math.round(weightKg * 2.0);
  const proteinKcal = calculatedProtein * 4;
  // Fat: 25% of total calories
  const fatKcal = targetCal * 0.25;
  const calculatedFat = Math.round(fatKcal / 9);
  // Remaining from carbs
  const remainingCarbKcal = Math.max(0, targetCal - proteinKcal - fatKcal);
  const calculatedCarbs = Math.round(remainingCarbKcal / 4);

  const handleApply = () => {
    onUpdateTargets({
      ...currentTargets,
      calories: targetCal,
      protein: calculatedProtein,
      carbs: calculatedCarbs,
      fats: calculatedFat,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">TDEE Calorie Calculator</h3>
            <p className="text-xs text-slate-500">Mifflin-St Jeor metabolic expenditure estimation</p>
          </div>
        </div>

        <div className="space-y-4">
          
          {/* Gender */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setGender('female')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                gender === 'female' ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              Female
            </button>
            <button
              type="button"
              onClick={() => setGender('male')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                gender === 'male' ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              Male
            </button>
          </div>

          {/* Age, Weight, Height */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-xl border border-slate-300 font-semibold text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Weight (kg)</label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-xl border border-slate-300 font-semibold text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Height (cm)</label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-xl border border-slate-300 font-semibold text-center"
              />
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Physical Activity</label>
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
            >
              <option value={1.2}>Sedentary (Desk job, little exercise)</option>
              <option value={1.375}>Light Exercise (1-3 days / week)</option>
              <option value={1.55}>Moderate Exercise (3-5 days / week)</option>
              <option value={1.725}>Heavy Exercise (6-7 days intense)</option>
              <option value={1.9}>Athlete / Physical job</option>
            </select>
          </div>

          {/* Fitness Goal */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Goal</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFitnessGoal('loss')}
                className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                  fitnessGoal === 'loss' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Fat Loss (-450)
              </button>
              <button
                type="button"
                onClick={() => setFitnessGoal('maintain')}
                className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                  fitnessGoal === 'maintain' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Maintenance
              </button>
              <button
                type="button"
                onClick={() => setFitnessGoal('gain')}
                className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                  fitnessGoal === 'gain' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Muscle Surplus (+350)
              </button>
            </div>
          </div>

          {/* Result Card */}
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Recommended Target
                </span>
                <span className="text-2xl font-black text-emerald-950">{targetCal.toLocaleString()} kcal</span>
              </div>
              <div className="text-right text-xs text-emerald-800">
                <span className="block font-semibold">BMR: {Math.round(bmr)} kcal</span>
                <span className="block text-emerald-600">Maintenance: {tdee} kcal</span>
              </div>
            </div>

            <div className="flex justify-between text-xs font-bold text-emerald-900 mt-3 pt-2 border-t border-emerald-200">
              <span>Protein: {calculatedProtein}g</span>
              <span>Carbs: {calculatedCarbs}g</span>
              <span>Fats: {calculatedFat}g</span>
            </div>
          </div>

          {/* Apply Button */}
          <div className="pt-2">
            <button
              onClick={handleApply}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center space-x-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Apply as My Daily Targets</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
