import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, Plus, Copy, Sparkles } from 'lucide-react';
import { DaySummaryInfo } from '../types';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDateIso: string;
  onSelectDate: (dateIso: string) => void;
  daySummaries: Record<string, DaySummaryInfo>;
  onCopyFromPreviousDay?: () => void;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  onClose,
  selectedDateIso,
  onSelectDate,
  daySummaries,
}) => {
  // Parse initial year and month from selectedDateIso (YYYY-MM-DD)
  const initialDate = selectedDateIso ? new Date(selectedDateIso + 'T00:00:00') : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-indexed

  if (!isOpen) return null;

  const todayIso = new Date().toISOString().split('T')[0];

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const jumpToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    onSelectDate(todayIso);
    onClose();
  };

  // Build calendar matrix
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleSelectDay = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const iso = `${currentYear}-${mm}-${dd}`;
    onSelectDate(iso);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative my-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Select Meal Day</h3>
            <p className="text-xs text-slate-500">Pick any date to plan or review meals & calories</p>
          </div>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-sm font-extrabold text-slate-800">
            {monthNames[currentMonth]} {currentYear}
          </div>

          <button
            onClick={nextMonth}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 gap-1 text-center mb-4">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
            <span key={i} className="text-[11px] font-bold text-slate-400 py-1 uppercase">
              {d}
            </span>
          ))}

          {/* Blank offset tiles */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10" />
          ))}

          {/* Month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const mm = String(currentMonth + 1).padStart(2, '0');
            const dd = String(dayNum).padStart(2, '0');
            const thisIso = `${currentYear}-${mm}-${dd}`;

            const isSelected = thisIso === selectedDateIso;
            const isToday = thisIso === todayIso;
            const summary = daySummaries[thisIso];
            const hasData = summary && summary.totalCalories > 0;

            return (
              <button
                key={dayNum}
                onClick={() => handleSelectDay(dayNum)}
                className={`h-11 rounded-xl flex flex-col items-center justify-center relative transition-all group ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30'
                    : isToday
                    ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-300'
                    : 'text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <span className="text-xs leading-none">{dayNum}</span>
                {/* Calories or data dot indicator */}
                {hasData && (
                  <span
                    className={`text-[9px] font-bold leading-none mt-1 ${
                      isSelected ? 'text-emerald-100' : 'text-emerald-600'
                    }`}
                  >
                    {summary.totalCalories}
                  </span>
                )}
                {!hasData && (
                  <span className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white/40' : 'bg-transparent'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Quick presets & Quick Native Picker */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Quick switch:</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={jumpToToday}
                className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const tmr = new Date();
                  tmr.setDate(tmr.getDate() + 1);
                  onSelectDate(tmr.toISOString().split('T')[0]);
                  onClose();
                }}
                className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg transition-colors"
              >
                Tomorrow
              </button>
            </div>
          </div>

          {/* Direct HTML Date Input for quick jumps to any date */}
          <div className="flex items-center space-x-2">
            <label className="text-xs font-bold text-slate-600 flex-shrink-0">
              Pick Specific Date:
            </label>
            <input
              type="date"
              value={selectedDateIso}
              onChange={(e) => {
                if (e.target.value) {
                  onSelectDate(e.target.value);
                  onClose();
                }
              }}
              className="flex-1 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
        </div>

      </div>
    </div>
  );
};
