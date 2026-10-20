import firebaseConfig from '../firebase/config.json';
import { DailyPlanState } from '../types';

const API_KEY = firebaseConfig.webAppConfig.apiKey;
const PROJECT_ID = firebaseConfig.webAppConfig.projectId;
const DATABASE_ID = firebaseConfig.databaseId || '(default)';

const AUTH_BASE_URL = 'https://identitytoolkit.googleapis.com/v1';
const TOKEN_REFRESH_URL = 'https://securetoken.googleapis.com/v1';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

interface StoredAuthSession {
  uid: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

const SESSION_STORAGE_KEY = 'nutriplan_firebase_auth_session';

let activeSession: StoredAuthSession | null = null;
let pendingSessionPromise: Promise<StoredAuthSession> | null = null;

/**
 * Helper to fetch with exponential backoff retry for transient 429/5xx errors
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  backoffMs = 500
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        return response;
      }
      if (attempt === retries) {
        return response;
      }
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt)));
  }
  return fetch(url, options);
}

/**
 * Convert JavaScript value to Firestore REST Value object
 */
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

/**
 * Convert Firestore REST Value object back to plain JavaScript value
 */
function fromFirestoreValue(firestoreVal: any): any {
  if (!firestoreVal || typeof firestoreVal !== 'object') return null;
  if ('stringValue' in firestoreVal) return firestoreVal.stringValue;
  if ('integerValue' in firestoreVal) return Number(firestoreVal.integerValue);
  if ('doubleValue' in firestoreVal) return Number(firestoreVal.doubleValue);
  if ('booleanValue' in firestoreVal) return Boolean(firestoreVal.booleanValue);
  if ('nullValue' in firestoreVal) return null;
  if ('arrayValue' in firestoreVal) {
    const values = firestoreVal.arrayValue?.values || [];
    return values.map((v: any) => fromFirestoreValue(v));
  }
  if ('mapValue' in firestoreVal) {
    const fields = firestoreVal.mapValue?.fields || {};
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      result[k] = fromFirestoreValue(v);
    }
    return result;
  }
  return null;
}

/**
 * Obtain or refresh a valid Firebase Anonymous Auth session
 */
async function ensureValidSession(forceRefresh = false): Promise<StoredAuthSession> {
  const now = Date.now();

  if (forceRefresh) {
    activeSession = null;
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  }

  if (!activeSession) {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        activeSession = JSON.parse(raw);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Return active session if token is still valid and non-empty (with 2-minute buffer)
  if (activeSession && activeSession.idToken && activeSession.expiresAt > now + 120000) {
    return activeSession;
  }

  if (pendingSessionPromise) {
    return pendingSessionPromise;
  }

  pendingSessionPromise = (async () => {
    try {
      if (activeSession?.refreshToken) {
        try {
          const res = await fetchWithRetry(`${TOKEN_REFRESH_URL}/token?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              grant_type: 'refresh_token',
              refresh_token: activeSession.refreshToken,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            activeSession = {
              uid: data.user_id,
              idToken: data.id_token,
              refreshToken: data.refresh_token,
              expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
            };
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(activeSession));
            return activeSession;
          }
        } catch (e) {
          console.warn('Token refresh failed, signing in fresh:', e);
        }
      }

      // Sign in anonymously via Firebase Identity Toolkit REST API
      const res = await fetchWithRetry(`${AUTH_BASE_URL}/accounts:signUp?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnSecureToken: true }),
      });

      if (!res.ok) {
        throw new Error(`Firebase Anonymous Auth failed with status ${res.status}`);
      }

      const data = await res.json();
      activeSession = {
        uid: data.localId,
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + Number(data.expiresIn || 3600) * 1000,
      };

      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(activeSession));
      } catch (e) {
        console.error(e);
      }

      return activeSession;
    } finally {
      pendingSessionPromise = null;
    }
  })();

  return pendingSessionPromise;
}

/**
 * Ensures user is authenticated via Firebase Anonymous Auth before any Firestore calls
 */
export function initAuthSession(onUserReady: (user: { uid: string }) => void): () => void {
  let cancelled = false;

  ensureValidSession()
    .then((session) => {
      if (!cancelled) {
        onUserReady({ uid: session.uid });
      }
    })
    .catch((err) => {
      console.error('Firebase auth initialization error:', err);
    });

  return () => {
    cancelled = true;
  };
}

/**
 * Fetches and polls daily meal plans saved in Cloud Firestore for this user
 */
export function subscribeToUserDailyPlans(
  userId: string,
  onPlansLoaded: (plans: Record<string, DailyPlanState>) => void,
  onError?: (err: Error) => void
): () => void {
  let stopped = false;

  const fetchPlans = async () => {
    if (stopped || !userId) return;
    try {
      let session = await ensureValidSession();
      let targetUid = session.uid || userId;
      let url = `${FIRESTORE_BASE_URL}/users/${encodeURIComponent(targetUid)}/plans?pageSize=100&key=${encodeURIComponent(API_KEY)}`;

      let response = await fetchWithRetry(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.idToken}`,
        },
      });

      // Fix: If token expired or mismatched, force refresh a valid auth session and retry with new Bearer token
      if (response.status === 401 || response.status === 403) {
        session = await ensureValidSession(true);
        targetUid = session.uid;
        url = `${FIRESTORE_BASE_URL}/users/${encodeURIComponent(targetUid)}/plans?pageSize=100&key=${encodeURIComponent(API_KEY)}`;
        response = await fetchWithRetry(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.idToken}`,
          },
        });
      }

      if (!response.ok) {
        throw new Error(`Firestore read failed (${response.status})`);
      }

      const data = await response.json();
      const documents = data.documents || [];
      const plansMap: Record<string, DailyPlanState> = {};

      for (const docItem of documents) {
        if (docItem.fields) {
          const parsed = fromFirestoreValue({ mapValue: { fields: docItem.fields } }) as DailyPlanState;
          if (parsed && parsed.dateIso) {
            plansMap[parsed.dateIso] = parsed;
          }
        }
      }

      if (!stopped) {
        onPlansLoaded(plansMap);
      }
    } catch (err: any) {
      console.error('Firestore fetch error:', err);
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
 * Saves or updates a specific day's plan in Firestore under users/{userId}/plans/{dateIso}.
 */
export async function saveDailyPlanToFirestore(
  userId: string,
  plan: DailyPlanState
): Promise<void> {
  if (!userId || !plan.dateIso) return;
  let session = await ensureValidSession();
  let targetUid = session.uid || userId;
  let url = `${FIRESTORE_BASE_URL}/users/${encodeURIComponent(targetUid)}/plans/${encodeURIComponent(plan.dateIso)}?key=${encodeURIComponent(API_KEY)}`;

  const firestoreMap = toFirestoreValue(plan);
  const bodyPayload = JSON.stringify({
    fields: firestoreMap.mapValue.fields,
  });

  let response = await fetchWithRetry(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.idToken}`,
    },
    body: bodyPayload,
  });

  // Fix: If token was rejected, refresh session and retry with new Bearer token
  if (response.status === 401 || response.status === 403) {
    session = await ensureValidSession(true);
    targetUid = session.uid;
    url = `${FIRESTORE_BASE_URL}/users/${encodeURIComponent(targetUid)}/plans/${encodeURIComponent(plan.dateIso)}?key=${encodeURIComponent(API_KEY)}`;
    response = await fetchWithRetry(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.idToken}`,
      },
      body: bodyPayload,
    });
  }

  if (!response.ok) {
    throw new Error(`Firestore write failed (${response.status})`);
  }
}

/**
 * Batch saves multiple day plans (e.g. when seeding or importing)
 */
export async function saveMultiplePlansToFirestore(
  userId: string,
  plans: Record<string, DailyPlanState>
): Promise<void> {
  if (!userId) return;
  const entries = Object.entries(plans);
  for (const [dateIso, plan] of entries) {
    if (dateIso && plan) {
      await saveDailyPlanToFirestore(userId, plan);
    }
  }
}
