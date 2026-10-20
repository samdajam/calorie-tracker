import React, { useState } from 'react';
import { X, ShoppingBag, CheckSquare, Square, Copy, Check } from 'lucide-react';
import { MealSlot } from '../types';

interface GroceryListModalProps {
  isOpen: boolean;
  onClose: () => void;
  meals: Record<string, MealSlot>;
}

export const GroceryListModal: React.FC<GroceryListModalProps> = ({
  isOpen,
  onClose,
  meals,
}) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Aggregate items
  const allItems: { id: string; name: string; portion: string; meal: string }[] = [];
  Object.values(meals).forEach((slot) => {
    slot.items.forEach((item) => {
      allItems.push({
        id: item.id,
        name: item.name,
        portion: item.portion,
        meal: slot.label,
      });
    });
  });

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = () => {
    const text = allItems
      .map((item) => `• ${item.name} (${item.portion}) - for ${item.meal}`)
      .join('\n');
    navigator.clipboard.writeText(`NutriPlan Daily Grocery List:\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Daily Grocery List</h3>
            <p className="text-xs text-slate-500">All ingredients compiled from your daily meals</p>
          </div>
        </div>

        {allItems.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Your meal plan is empty! Add foods or generate an AI plan first.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 pr-1">
              {allItems.map((item) => {
                const isChecked = !!checkedItems[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className={`py-2.5 flex items-center justify-between cursor-pointer group transition-opacity ${
                      isChecked ? 'opacity-40 line-through' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="text-emerald-600 flex-shrink-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 group-hover:text-emerald-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-semibold text-slate-800 block truncate">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-slate-400">{item.portion}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex-shrink-0">
                      {item.meal}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                {Object.values(checkedItems).filter(Boolean).length} of {allItems.length} bought
              </span>

              <button
                onClick={copyToClipboard}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl transition-colors border border-emerald-200"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy to Notes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
