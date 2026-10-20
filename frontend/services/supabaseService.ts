import { DailyPlanState } from '../types';

export interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

const SUPABASE_CONFIG_KEY = 'nutriplan_supabase_config';
const DEVICE_USER_ID_KEY = 'nutriplan_supabase_user_id';

/**
 * Safely read environment variables across Vite (import.meta.env) and Node/Webpack (process.env)
 * so Vercel environment variables work out-of-the-box in production.
 */
function getEnvVar(keys: string[]): string | undefined {
  for (const key of keys) {
    try {
      const metaEnv = (import.meta as any)?.env;
      if (metaEnv && metaEnv[key]) {
        return String(metaEnv[key]);
      }
    } catch {
      // Ignore if import.meta is unavailable
    }
    try {
      if (typeof process !== 'undefined' && process.env && (process.env as any)[key]) {
        return String((process.env as any)[key]);
      }
    } catch {
      // Ignore if process.env is unavailable
    }
  }
  return undefined;
}

/**
 * Retrieve Supabase URL & Anon Key from localStorage or Vercel environment variables
 */
export function getSupabaseConfig(): SupabaseCredentials | null {
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.url && parsed.anonKey) {
        const cleanUrl = parsed.url.trim().replace(/\/+$/, '');
        new URL(cleanUrl);
        return {
          url: cleanUrl,
          anonKey: parsed.anonKey.trim(),
        };
      }
    }
  } catch (e) {
    console.warn('Invalid Supabase config in localStorage:', e);
  }

  // Fallback to Vercel / Vite environment variables if configured
  const envUrl = getEnvVar(['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL']);
  const envKey = getEnvVar(['VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY']);

  if (envUrl && envKey) {
    try {
      const cleanUrl = envUrl.trim().replace(/\/+$/, '');
      new URL(cleanUrl);
      return {
        url: cleanUrl,
        anonKey: envKey.trim(),
      };
    } catch (e) {
      console.warn('Invalid Supabase URL in environment variables:', e);
    }
  }

  return null;
}

/**
 * Save Supabase Project URL and Anon Key
 */
export function saveSupabaseConfig(config: SupabaseCredentials): void {
  const cleanUrl = config.url.trim().replace(/\/+$/, '');
  localStorage.setItem(
    SUPABASE_CONFIG_KEY,
    JSON.stringify({
      url: cleanUrl,
      anonKey: config.anonKey.trim(),
    })
  );
}

/**
 * Clear stored Supabase configuration
 */
export function clearSupabaseConfig(): void {
  localStorage.removeItem(SUPABASE_CONFIG_KEY);
}

/**
 * Get or create a persistent user identifier for partitioning rows in Supabase
 */
export function getOrCreateSupabaseUserId(): string {
  let uid = localStorage.getItem(DEVICE_USER_ID_KEY);
  if (!uid) {
    uid = 'usr_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem(DEVICE_USER_ID_KEY, uid);
  }
  return uid;
}

/**
 * Build standard Supabase PostgREST headers
 */
function buildSupabaseHeaders(anonKey: string, extraHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
}

/**
 * Test connection and verify that the `daily_plans` table exists in Supabase
 */
export async function testSupabaseConnection(config: SupabaseCredentials): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const cleanUrl = config.url.trim().replace(/\/+$/, '');
    new URL(cleanUrl);

    const endpoint = `${cleanUrl}/rest/v1/daily_plans?select=date_iso&limit=1`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: buildSupabaseHeaders(config.anonKey.trim()),
    });

    if (response.ok) {
      return {
        ok: true,
        message: 'Connected to Supabase `daily_plans` table!',
      };
    }

    const errText = await response.text();
    if (response.status === 404 || errText.includes('42P01') || errText.includes('relation') || errText.includes('does not exist')) {
      return {
        ok: false,
        message: 'Connected to Supabase project, but table `daily_plans` was not found. Run the SQL setup script below in your Supabase SQL Editor.',
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        message: 'Authentication failed (401/403). Check your Supabase anon public key and RLS policy.',
      };
    }

    return {
      ok: false,
      message: `Supabase returned status ${response.status}: ${errText.slice(0, 120)}`,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || 'Invalid Supabase URL or network error.',
    };
  }
}

/**
 * Initialize session and return persistent user ID
 */
export function initSupabaseSession(onUserReady: (user: { uid: string }) => void): () => void {
  const uid = getOrCreateSupabaseUserId();
  onUserReady({ uid });
  return () => {};
}

/**
 * Fetch and poll all daily meal plans for this user from Supabase `daily_plans` table
 */
export function subscribeToSupabaseDailyPlans(
  userId: string,
  onPlansLoaded: (plans: Record<string, DailyPlanState>) => void,
  onError?: (err: Error) => void
): () => void {
  let stopped = false;

  const fetchPlans = async () => {
    if (stopped || !userId) return;
    const config = getSupabaseConfig();
    if (!config) {
      if (!stopped && onError) {
        onError(new Error('Supabase credentials not configured'));
      }
      return;
    }

    try {
      const endpoint = `${config.url}/rest/v1/daily_plans?user_id=eq.${encodeURIComponent(userId)}&select=date_iso,plan_data`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: buildSupabaseHeaders(config.anonKey),
      });

      if (!response.ok) {
        throw new Error(`Supabase fetch failed (${response.status})`);
      }

      const rows = await response.json();
      const plansMap: Record<string, DailyPlanState> = {};

      if (Array.isArray(rows)) {
        for (const row of rows) {
          const plan = row.plan_data as DailyPlanState;
          const dateIso = row.date_iso || plan?.dateIso;
          if (plan && dateIso) {
            plansMap[dateIso] = plan;
          }
        }
      }

      if (!stopped) {
        onPlansLoaded(plansMap);
      }
    } catch (err: any) {
      console.warn('Supabase sync warning:', err);
      if (!stopped && onError) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  };

  fetchPlans();
  const intervalId = window.setInterval(fetchPlans, 20000);

  return () => {
    stopped = true;
    window.clearInterval(intervalId);
  };
}

/**
 * Upsert a single day's meal plan into Supabase `daily_plans` table
 */
export async function saveDailyPlanToSupabase(
  userId: string,
  plan: DailyPlanState
): Promise<void> {
  if (!userId || !plan.dateIso) return;
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Supabase not configured');
  }

  const endpoint = `${config.url}/rest/v1/daily_plans?on_conflict=user_id,date_iso`;
  const payload = {
    user_id: userId,
    date_iso: plan.dateIso,
    plan_data: plan,
    updated_at: new Date().toISOString(),
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: buildSupabaseHeaders(config.anonKey, {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Supabase upsert failed (${response.status}): ${errBody}`);
  }
}

/**
 * Batch upsert multiple day plans into Supabase `daily_plans` table in a single request
 */
export async function saveMultiplePlansToSupabase(
  userId: string,
  plans: Record<string, DailyPlanState>
): Promise<void> {
  if (!userId) return;
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Supabase not configured');
  }

  const rows = Object.entries(plans)
    .filter(([dateIso, plan]) => Boolean(dateIso && plan))
    .map(([dateIso, plan]) => ({
      user_id: userId,
      date_iso: dateIso,
      plan_data: plan,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return;

  const endpoint = `${config.url}/rest/v1/daily_plans?on_conflict=user_id,date_iso`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: buildSupabaseHeaders(config.anonKey, {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Supabase batch upsert failed (${response.status}): ${errBody}`);
  }
}

export const SUPABASE_SQL_SCHEMA = `-- Run this in your Supabase SQL Editor to create the table:
create table if not exists public.daily_plans (
  user_id text not null,
  date_iso text not null,
  plan_data jsonb not null,
  updated_at timestamptz default now(),
  primary key (user_id, date_iso)
);

-- Enable Row Level Security (RLS) and allow anon access:
alter table public.daily_plans enable row level security;

create policy "Allow public read and write access"
  on public.daily_plans
  for all
  to anon, authenticated
  using (true)
  with check (true);`;
