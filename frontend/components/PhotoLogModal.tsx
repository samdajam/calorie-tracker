import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  Loader2,
  Check,
  RotateCcw,
  Receipt,
  Utensils,
  AlertCircle,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';
import { MealType, FoodItem } from '../types';
import { analyzeMealPhoto, PhotoDetectionResult } from '../services/geminiService';

interface PhotoLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMealSlot?: MealType;
  onLogItems: (slot: MealType, items: Omit<FoodItem, 'id'>[]) => void;
}

export const PhotoLogModal: React.FC<PhotoLogModalProps> = ({
  isOpen,
  onClose,
  defaultMealSlot = 'lunch',
  onLogItems,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<MealType>(defaultMealSlot);
  const [scanMode, setScanMode] = useState<'meal' | 'receipt'>('meal');
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');

  // Image data state
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');

  // Camera streaming
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<PhotoDetectionResult | null>(null);
  const [selectedItemIndexes, setSelectedItemIndexes] = useState<Record<number, boolean>>({});

  // Sync defaultMealSlot when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedSlot(defaultMealSlot);
      setCameraError(null);
      setAnalysisError(null);
    } else {
      stopCamera();
      setImageDataUrl(null);
      setDetectionResult(null);
    }
  }, [isOpen, defaultMealSlot]);

  // Handle Camera Start/Stop
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        'Unable to access camera. Please ensure camera permissions are allowed, or upload an image file instead.'
      );
      setMode('upload');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  const handleSwitchToCamera = () => {
    setMode('camera');
    startCamera();
  };

  const handleSwitchToUpload = () => {
    stopCamera();
    setMode('upload');
  };

  // Capture snapshot from live video
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setImageDataUrl(dataUrl);
      setImageMimeType('image/jpeg');
      stopCamera();
      triggerAiAnalysis(dataUrl, 'image/jpeg');
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAnalysisError('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageDataUrl(result);
      setImageMimeType(file.type);
      triggerAiAnalysis(result, file.type);
    };
    reader.readAsDataURL(file);
  };

  // Trigger Gemini Vision
  const triggerAiAnalysis = async (dataUrl: string, mime: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setDetectionResult(null);

    try {
      // Strip base64 header
      const base64Data = dataUrl.split(',')[1];
      const result = await analyzeMealPhoto(base64Data, mime, scanMode);
      setDetectionResult(result);

      if (result.suggestedMealSlot) {
        setSelectedSlot(result.suggestedMealSlot);
      }

      // Default select all detected items
      const initialSelection: Record<number, boolean> = {};
      result.items.forEach((_, idx) => {
        initialSelection[idx] = true;
      });
      setSelectedItemIndexes(initialSelection);
    } catch (err: any) {
      console.error(err);
      setAnalysisError(
        'Gemini Vision was unable to recognize foods in this image. Try taking a clearer, well-lit photo or enter the food manually.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle item checkbox
  const toggleItemSelection = (index: number) => {
    setSelectedItemIndexes((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Update item field directly in preview
  const handleUpdateItem = (
    index: number,
    field: 'name' | 'portion' | 'calories' | 'protein' | 'carbs' | 'fats',
    value: string | number
  ) => {
    if (!detectionResult) return;
    const updatedItems = [...detectionResult.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: typeof value === 'number' ? Math.max(0, value) : value,
    };
    setDetectionResult({
      ...detectionResult,
      items: updatedItems,
    });
  };

  // Confirm logging
  const handleConfirmLog = () => {
    if (!detectionResult) return;

    const itemsToLog = detectionResult.items
      .filter((_, idx) => !!selectedItemIndexes[idx])
      .map((item) => ({
        name: item.name,
        portion: item.portion,
        calories: Number(item.calories) || 0,
        protein: Number(item.protein) || 0,
        carbs: Number(item.carbs) || 0,
        fats: Number(item.fats) || 0,
      }));

    if (itemsToLog.length === 0) {
      alert('Please select at least one item to log.');
      return;
    }

    onLogItems(selectedSlot, itemsToLog);
    onClose();
  };

  const handleReset = () => {
    setImageDataUrl(null);
    setDetectionResult(null);
    setAnalysisError(null);
    if (mode === 'camera') {
      startCamera();
    }
  };

  if (!isOpen) return null;

  // Selected totals
  const totalSelectedCal = detectionResult
    ? detectionResult.items.reduce(
        (acc, item, idx) => (selectedItemIndexes[idx] ? acc + (Number(item.calories) || 0) : acc),
        0
      )
    : 0;

  const totalSelectedProtein = detectionResult
    ? detectionResult.items.reduce(
        (acc, item, idx) => (selectedItemIndexes[idx] ? acc + (Number(item.protein) || 0) : acc),
        0
      )
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative my-6 max-h-[92vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-4 flex-shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">AI Vision Food Logger</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                Gemini 2.5
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Snap a meal or upload a grocery receipt to detect dishes & macros automatically
            </p>
          </div>
        </div>

        {/* Target Slot and Mode Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 flex-shrink-0">
          {/* Destination Slot */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Destination Meal Slot
            </label>
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value as MealType)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="breakfast">Breakfast</option>
              <option value="morningSnack">Morning Snack</option>
              <option value="lunch">Lunch</option>
              <option value="afternoonSnack">Afternoon Snack</option>
              <option value="dinner">Dinner</option>
            </select>
          </div>

          {/* Scan Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Photo Content Type
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setScanMode('meal')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 border transition-colors ${
                  scanMode === 'meal'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Prepared Meal</span>
              </button>
              <button
                type="button"
                onClick={() => setScanMode('receipt')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 border transition-colors ${
                  scanMode === 'receipt'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Receipt / Label</span>
              </button>
            </div>
          </div>
        </div>

        {/* Body / Capture Area */}
        <div className="flex-1 overflow-y-auto pr-0.5">
          {!imageDataUrl ? (
            <div className="space-y-3">
              {/* Camera vs Upload Switch */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={handleSwitchToUpload}
                  className={`pb-2 px-4 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors ${
                    mode === 'upload'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Image File</span>
                </button>
                <button
                  type="button"
                  onClick={handleSwitchToCamera}
                  className={`pb-2 px-4 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors ${
                    mode === 'camera'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Use Device Camera</span>
                </button>
              </div>

              {cameraError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              {mode === 'camera' ? (
                /* Live Camera Stream View */
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-300 aspect-[4/3] flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!streamActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 bg-slate-950/80 p-4 text-center">
                      <Camera className="w-8 h-8 mb-2 animate-pulse text-emerald-400" />
                      <p className="text-xs">Initializing camera feed...</p>
                    </div>
                  )}

                  {streamActive && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-3">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-xs sm:text-sm shadow-xl flex items-center space-x-2 transition-transform transform active:scale-95 border-2 border-white"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Capture & Analyze</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* File Upload Dropzone */
                <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 transition-all group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Click to browse or drop an image here
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Supports high-resolution food snapshots, meal prep bowls, restaurant plates, or grocery store receipts.
                  </p>
                  <span className="mt-4 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-white border border-emerald-200 rounded-xl shadow-sm">
                    Select JPEG, PNG, or WEBP
                  </span>
                </label>
              )}
            </div>
          ) : (
            /* Image Preview & Vision Results */
            <div className="space-y-4">
              
              {/* Snapshot thumbnail banner */}
              <div className="flex items-center space-x-3 p-3 bg-slate-100 rounded-2xl border border-slate-200">
                <img
                  src={imageDataUrl}
                  alt="Scanned Food"
                  className="w-16 h-16 object-cover rounded-xl border border-slate-300 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                    {detectionResult ? detectionResult.detectedTitle : 'Analyzing photo...'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {detectionResult
                      ? `${detectionResult.items.length} items recognized • logging into ${selectedSlot}`
                      : 'Gemini Vision AI is identifying ingredients...'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors text-xs font-semibold flex items-center space-x-1"
                  title="Take another picture"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Retake</span>
                </button>
              </div>

              {/* Loading indicator */}
              {isAnalyzing && (
                <div className="p-8 text-center flex flex-col items-center justify-center space-y-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
                    <Sparkles className="w-5 h-5 text-emerald-600 absolute inset-0 m-auto" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-800">
                      Gemini Vision is inspecting your meal...
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Estimating portion sizes, calorie counts, and macronutrients
                    </p>
                  </div>
                </div>
              )}

              {/* Error display */}
              {analysisError && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center space-x-2 font-bold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Analysis Error</span>
                  </div>
                  <p>{analysisError}</p>
                  <button
                    onClick={handleReset}
                    className="mt-1 px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold"
                  >
                    Try Another Photo
                  </button>
                </div>
              )}

              {/* Detected Items List */}
              {detectionResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Detected Food Items ({detectionResult.items.length})
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Select or tweak items before adding them to your plan
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-emerald-700">
                        {totalSelectedCal} kcal
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {totalSelectedProtein}g Protein
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {detectionResult.items.map((item, index) => {
                      const isSelected = !!selectedItemIndexes[index];
                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-2xl border transition-all ${
                            isSelected
                              ? 'bg-white border-emerald-300 shadow-sm'
                              : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-start space-x-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItemSelection(index)}
                              className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                            />
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs">
                              <div className="sm:col-span-3">
                                <label className="text-[10px] text-slate-400 uppercase font-bold block">
                                  Dish / Component
                                </label>
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) =>
                                    handleUpdateItem(index, 'name', e.target.value)
                                  }
                                  className="w-full font-bold text-slate-800 bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-500 focus:outline-none py-0.5"
                                />
                              </div>

                              <div className="sm:col-span-1">
                                <label className="text-[10px] text-slate-400 uppercase font-bold block">
                                  Portion
                                </label>
                                <input
                                  type="text"
                                  value={item.portion}
                                  onChange={(e) =>
                                    handleUpdateItem(index, 'portion', e.target.value)
                                  }
                                  className="w-full text-slate-600 bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-500 focus:outline-none py-0.5"
                                />
                              </div>

                              <div className="sm:col-span-1">
                                <label className="text-[10px] text-slate-400 uppercase font-bold block">
                                  Calories
                                </label>
                                <input
                                  type="number"
                                  value={item.calories}
                                  onChange={(e) =>
                                    handleUpdateItem(index, 'calories', Number(e.target.value))
                                  }
                                  className="w-full font-bold text-emerald-700 bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-500 focus:outline-none py-0.5"
                                />
                              </div>

                              <div className="sm:col-span-1">
                                <label className="text-[10px] text-slate-400 uppercase font-bold block">
                                  P / C / F (g)
                                </label>
                                <div className="text-[11px] text-slate-500 py-0.5">
                                  {item.protein} / {item.carbs} / {item.fats}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {detectionResult.notes && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-200">
                      AI Note: {detectionResult.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        {detectionResult && (
          <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-200 flex-shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100"
            >
              Scan Another Photo
            </button>

            <button
              type="button"
              onClick={handleConfirmLog}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 transition-all transform active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>
                Add Selected to {selectedSlot.charAt(0).toUpperCase() + selectedSlot.slice(1)} ({totalSelectedCal} cal)
              </span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
