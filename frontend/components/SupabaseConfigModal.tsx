import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Check,
  Copy,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Trash2,
  Download,
  Upload,
  Rocket,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  SUPABASE_SQL_SCHEMA,
} from '../services/supabaseService';
import { DailyPlanState } from '../types';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
  userId: string | null;
  plansByDate: Record<string, DailyPlanState>;
  onImportPlans: (imported: Record<string, DailyPlanState>) => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
  userId,
  plansByDate,
  onImportPlans,
}) => {
  const [activeTab, setActiveTab] = useState<'supabase' | 'vercel' | 'backup'>('supabase');
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const existing = getSupabaseConfig();
      if (existing) {
        setUrl(existing.url);
        setAnonKey(existing.anonKey);
      }
      setTestResult(null);
      setImportStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) return;

    setIsTesting(true);
    setTestResult(null);

    const creds = { url: url.trim(), anonKey: anonKey.trim() };
    const result = await testSupabaseConnection(creds);
    setIsTesting(false);
    setTestResult(result);

    saveSupabaseConfig(creds);
    if (result.ok) {
      onConfigSaved();
    }
  };

  const handleDisconnect = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setTestResult({
      ok: false,
      message: 'Disconnected from Supabase. Using local browser storage.',
    });
    onConfigSaved();
  };

  const handleExportJson = () => {
    const dataStr = JSON.stringify(plansByDate, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `nutriplan-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed && typeof parsed === 'object') {
          onImportPlans(parsed);
          setImportStatus(`Successfully imported ${Object.keys(parsed).length} day(s) of meal plans!`);
        }
      } catch (err) {
        setImportStatus('Invalid JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative my-8 max-h-[92vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4 flex-shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Cloud Database &amp; Production Settings
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                Vercel Ready
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Configure Supabase PostgreSQL sync, Vercel deployment variables, or backup your data
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-2xl mb-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'supabase'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Supabase Setup</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vercel')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'vercel'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 text-teal-600" />
            <span>Vercel Deploy Guide</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'backup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>Export / Import</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {activeTab === 'supabase' && (
            <>
              {/* Step 1: SQL Table Setup */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Step 1: Run this SQL in your Supabase SQL Editor</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied SQL!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy SQL Script</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-3.5 rounded-2xl bg-slate-900 text-emerald-300 text-[11px] font-mono overflow-x-auto leading-relaxed border border-slate-800">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>

              {/* Step 2: Project URL & Anon Key Form */}
              <form onSubmit={handleTestAndSave} className="space-y-4 pt-2 border-t border-slate-100">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Step 2: Enter Supabase API Credentials (Settings → API)
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Supabase Anon / Public Key
                  </label>
                  <input
                    type="password"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Syncs records under your User ID: <code className="text-slate-600 font-semibold">{userId || 'initializing'}</code>
                  </p>
                </div>

                {testResult && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs flex items-start space-x-2.5 ${
                      testResult.ok
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {testResult.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <span className="font-bold block">
                        {testResult.ok ? 'Connection Verified!' : 'Connection Notice'}
                      </span>
                      <span>{testResult.message}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  {getSupabaseConfig() ? (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Disconnect Supabase</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={isTesting || !url.trim() || !anonKey.trim()}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center space-x-1.5 transition-all"
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Testing &amp; Syncing...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Save &amp; Connect Supabase</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}

          {activeTab === 'vercel' && (
            <div className="space-y-4 text-xs text-slate-600">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1.5">
                <h4 className="text-sm font-extrabold text-emerald-950 flex items-center space-x-1.5">
                  <Rocket className="w-4 h-4 text-emerald-600" />
                  <span>Deploying NutriPlan to Vercel</span>
                </h4>
                <p className="text-emerald-900/80">
                  This repository includes a production <code className="font-mono font-bold">vercel.json</code> configuration with SPA routing rewrites and security headers pre-configured.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                  Environment Variables in Vercel Dashboard (Settings → Environment Variables)
                </h5>
                <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-[11px] space-y-2 border border-slate-800">
                  <div>
                    <span className="text-slate-400"># Required for Gemini 2.5 AI features:</span>
                    <div className="text-emerald-400">API_KEY=your_google_gemini_api_key</div>
                  </div>
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-400"># Optional (auto-connects Supabase without UI prompt):</span>
                    <div className="text-sky-300">VITE_SUPABASE_URL=https://your-project.supabase.co</div>
                    <div className="text-sky-300">VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key</div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block">Zero-Config Local Persistence Fallback</span>
                <p>
                  Even before Supabase environment variables are added, the app automatically persists all multi-day meal plans and water logs in <code className="font-mono">localStorage</code> so your deployed Vercel URL works immediately upon first visit.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4 text-xs text-slate-600">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Export All Meal Plans (JSON)</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Download a complete backup of all your logged days ({Object.keys(plansByDate).length} days stored) to transfer across devices.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 flex-shrink-0 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup</span>
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Restore from JSON Backup</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Import a previously exported NutriPlan <code className="font-mono">.json</code> file and sync it to Supabase.
                  </p>
                </div>
                <label className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 flex-shrink-0 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Upload JSON</span>
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportJson}
                    className="hidden"
                  />
                </label>
              </div>

              {importStatus && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-semibold">
                  {importStatus}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
