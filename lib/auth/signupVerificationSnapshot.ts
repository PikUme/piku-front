export type SignupVerificationSnapshot = {
  email: string;
  emailVerificationToken: string;
  expiresAt: string;
};

export type SignupDocumentContext = {
  initialPathname: string | null;
  navigationType: string | null;
  restoreAllowed: boolean | null;
};

declare global {
  interface Window {
    __pikumeSignupDocumentContext?: SignupDocumentContext;
  }
}

const STORAGE_KEY = 'pikume:signup-email-verification:v1';
const SNAPSHOT_KEYS = ['email', 'emailVerificationToken', 'expiresAt', 'version'];
const ISO_VERIFICATION_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(?:(Z)|([+-])(\d{2}):(\d{2}))?$/i;

export const parseSignupVerificationTime = (value: string) =>
  Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}+09:00`);

const isValidSignupVerificationTime = (value: string) => {
  const parts = ISO_VERIFICATION_TIME.exec(value);
  if (!parts) return false;

  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const hour = Number(parts[4]);
  const minute = Number(parts[5]);
  const second = Number(parts[6] ?? 0);
  const monthDays = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > monthDays[month - 1]) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;
  if (parts[9] && (Number(parts[10]) > 23 || Number(parts[11]) > 59)) return false;

  return Number.isFinite(parseSignupVerificationTime(value));
};

const isLeapYear = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const getDocumentContext = (): SignupDocumentContext => {
  if (window.__pikumeSignupDocumentContext) return window.__pikumeSignupDocumentContext;

  let initialPathname: string | null = null;
  let navigationType: string | null = null;
  try {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navigation) {
      initialPathname = new URL(navigation.name, window.location.origin).pathname;
      navigationType = navigation.type;
    }
  } catch {
    // Browsers without usable navigation timing fall back to reauthentication.
  }

  const context = {
    initialPathname,
    navigationType,
    restoreAllowed: null,
  };
  window.__pikumeSignupDocumentContext = context;
  return context;
};

export const saveSignupVerificationSnapshot = (snapshot: SignupVerificationSnapshot) => {
  if (!isValidEmail(snapshot.email) || !snapshot.emailVerificationToken.trim()) return;
  if (!isValidSignupVerificationTime(snapshot.expiresAt)) return;
  const expiresAt = parseSignupVerificationTime(snapshot.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      email: snapshot.email,
      emailVerificationToken: snapshot.emailVerificationToken,
      expiresAt: snapshot.expiresAt,
    }));
  } catch {
    // Storage is optional. The current signup flow remains usable in memory.
  }
};

export const restoreSignupVerificationSnapshot = (): SignupVerificationSnapshot | null => {
  if (typeof window === 'undefined') return null;

  const context = getDocumentContext();
  if (context.restoreAllowed === null) {
    context.restoreAllowed = context.initialPathname === '/signup' && context.navigationType === 'reload';
    if (!context.restoreAllowed) {
      clearSignupVerificationSnapshot();
      return null;
    }
  }
  if (!context.restoreAllowed) return null;

  let stored: string | null = null;
  try {
    stored = window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage is optional. The current signup flow remains usable in memory.
  }
  if (!stored) return null;

  try {
    const value: unknown = JSON.parse(stored);
    if (!isSnapshot(value) || parseSignupVerificationTime(value.expiresAt) <= Date.now()) {
      clearSignupVerificationSnapshot();
      return null;
    }
    return {
      email: value.email,
      emailVerificationToken: value.emailVerificationToken,
      expiresAt: value.expiresAt,
    };
  } catch {
    clearSignupVerificationSnapshot();
    return null;
  }
};

export const clearSignupVerificationSnapshot = () => {
  if (typeof window === 'undefined') return;
  if (window.__pikumeSignupDocumentContext) {
    window.__pikumeSignupDocumentContext.restoreAllowed = false;
  }
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage cleanup must not interrupt the signup flow.
  }
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isSnapshot = (value: unknown): value is SignupVerificationSnapshot & { version: 1 } => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const snapshot = value as Record<string, unknown>;
  const keys = Object.keys(snapshot).sort();
  return keys.length === SNAPSHOT_KEYS.length
    && keys.every((key, index) => key === SNAPSHOT_KEYS[index])
    && snapshot.version === 1
    && typeof snapshot.email === 'string'
    && isValidEmail(snapshot.email)
    && typeof snapshot.emailVerificationToken === 'string'
    && Boolean(snapshot.emailVerificationToken.trim())
    && typeof snapshot.expiresAt === 'string'
    && isValidSignupVerificationTime(snapshot.expiresAt);
};
