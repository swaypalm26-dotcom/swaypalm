export type NetworkHealthStatus = 'online' | 'offline' | 'degraded';

export interface NetworkStateSnapshot {
  status: NetworkHealthStatus;
  errorMessage: string | null;
  lastUpdatedAt: number;
}

type NetworkListener = (state: NetworkStateSnapshot) => void;

const listeners = new Set<NetworkListener>();

let currentState: NetworkStateSnapshot = {
  status:
    typeof navigator !== 'undefined' && navigator.onLine === false
      ? 'offline'
      : 'online',
  errorMessage:
    typeof navigator !== 'undefined' && navigator.onLine === false
      ? 'You are currently offline. Check your internet connection.'
      : null,
  lastUpdatedAt: Date.now(),
};

function emitNetworkState() {
  for (const listener of listeners) {
    try {
      listener(currentState);
    } catch {
      // keep other subscribers notified
    }
  }
}

export function getNetworkState(): NetworkStateSnapshot {
  return currentState;
}

export function subscribeNetworkState(listener: NetworkListener): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

export function reportNetworkOffline(
  message = 'You are offline. Changes may not sync until connection returns.'
) {
  currentState = {
    status: 'offline',
    errorMessage: message,
    lastUpdatedAt: Date.now(),
  };
  emitNetworkState();
}

export function reportNetworkIssue(
  message = 'Network connection is unstable or unreachable. Please retry.'
) {
  const isOffline =
    typeof navigator !== 'undefined' && navigator.onLine === false;
  currentState = {
    status: isOffline ? 'offline' : 'degraded',
    errorMessage: isOffline
      ? 'You are offline. Check your internet connection and retry.'
      : message,
    lastUpdatedAt: Date.now(),
  };
  emitNetworkState();
}

export function reportNetworkHealthy() {
  if (
    typeof navigator !== 'undefined' &&
    navigator.onLine === false
  ) {
    reportNetworkOffline();
    return;
  }
  if (currentState.status === 'online' && currentState.errorMessage === null) {
    return;
  }
  currentState = {
    status: 'online',
    errorMessage: null,
    lastUpdatedAt: Date.now(),
  };
  emitNetworkState();
}

export function clearNetworkErrorBanner() {
  currentState = {
    status:
      typeof navigator !== 'undefined' && navigator.onLine === false
        ? 'offline'
        : 'online',
    errorMessage: null,
    lastUpdatedAt: Date.now(),
  };
  emitNetworkState();
}

export function isPermissionError(error: unknown): boolean {
  const code = String((error as { code?: unknown })?.code || '').toLowerCase();
  const msg = String(
    error instanceof Error ? error.message : error || ''
  ).toLowerCase();

  return (
    code.includes('permission-denied') ||
    msg.includes('missing or insufficient permissions') ||
    msg.includes('permission_denied')
  );
}

export function isNetworkError(error: unknown): boolean {
  if (isPermissionError(error)) return false;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }

  const code = String((error as { code?: unknown })?.code || '').toLowerCase();
  const name = String((error as { name?: unknown })?.name || '').toLowerCase();
  const msg = String(
    error instanceof Error ? error.message : error || ''
  ).toLowerCase();

  if (
    code.includes('unavailable') ||
    code.includes('deadline-exceeded') ||
    code.includes('network-request-failed') ||
    code.includes('auth/timeout') ||
    code.includes('resource-exhausted') === false && code.includes('aborted')
  ) {
    return true;
  }

  if (name === 'aborterror' || name === 'timeouterror') {
    return true;
  }

  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('network request failed') ||
    msg.includes('network-request-failed') ||
    msg.includes('load failed') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('err_network') ||
    msg.includes('the client is offline') ||
    msg.includes('client is offline') ||
    msg.includes('could not reach cloud firestore') ||
    msg.includes('unable to resolve host') ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('socket hang up')
  );
}

export function getFriendlyNetworkErrorMessage(
  error: unknown,
  fallback = 'Unable to connect to SwayPalm servers. Please check your connection and try again.'
): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'You appear to be offline. Reconnect to the internet and try again.';
  }

  const code = String((error as { code?: unknown })?.code || '').toLowerCase();
  const name = String((error as { name?: unknown })?.name || '').toLowerCase();
  const rawMessage = error instanceof Error ? error.message : String(error || '');
  const lower = rawMessage.toLowerCase();

  if (name === 'aborterror' || name === 'timeouterror' || lower.includes('timed out')) {
    return 'The request timed out due to a slow connection. Please try again.';
  }
  if (
    code.includes('auth/network-request-failed') ||
    lower.includes('network-request-failed')
  ) {
    return 'Network error communicating with authentication service. Check your connection and retry.';
  }
  if (
    code.includes('unavailable') ||
    lower.includes('client is offline') ||
    lower.includes('could not reach cloud firestore')
  ) {
    return 'Database connection interrupted. Retrying automatically when your network stabilizes.';
  }
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed')
  ) {
    return 'Could not reach SwayPalm servers. Check your internet connection and try again.';
  }

  return rawMessage.trim() || fallback;
}

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  reportErrors?: boolean;
}

export interface SafeFetchResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  isNetworkFailure: boolean;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

export async function safeFetchJson<T = Record<string, unknown>>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const timeoutMs = options.timeoutMs ?? 15000;
  const maxRetries = options.retries ?? (method === 'GET' ? 1 : 0);
  const reportErrors = options.reportErrors !== false;

  const {
    timeoutMs: _timeoutMs,
    retries: _retries,
    reportErrors: _reportErrors,
    signal: externalSignal,
    ...fetchInit
  } = options;

  let attempt = 0;

  while (attempt <= maxRetries) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const msg = 'You are offline. Reconnect to the internet and try again.';
      if (reportErrors) reportNetworkOffline(msg);
      return {
        ok: false,
        status: 0,
        data: null,
        error: msg,
        isNetworkFailure: true,
      };
    }

    const controller = new AbortController();
    const timer =
      typeof window !== 'undefined'
        ? window.setTimeout(() => controller.abort(), timeoutMs)
        : setTimeout(() => controller.abort(), timeoutMs);

    const onExternalAbort = () => controller.abort();
    externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

    try {
      const response = await fetch(url, {
        ...fetchInit,
        signal: controller.signal,
      });

      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);

      let parsed: T | null = null;
      const contentType = response.headers.get('content-type') || '';
      const rawText = await response.text();
      if (rawText.trim().length > 0) {
        if (contentType.includes('application/json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
          try {
            parsed = JSON.parse(rawText) as T;
          } catch {
            parsed = null;
          }
        }
      }

      if (isRetryableStatus(response.status) && attempt < maxRetries) {
        attempt += 1;
        await new Promise((r) => setTimeout(r, 450 * attempt));
        continue;
      }

      if (!response.ok) {
        const parsedError =
          parsed && typeof parsed === 'object' && 'error' in parsed
            ? String((parsed as { error?: unknown }).error || '')
            : '';
        const errMsg =
          parsedError ||
          (response.status >= 500
            ? `Server temporarily unavailable (HTTP ${response.status}). Please try again.`
            : `Request failed (HTTP ${response.status}).`);

        if (reportErrors && response.status >= 502) {
          reportNetworkIssue(errMsg);
        }

        return {
          ok: false,
          status: response.status,
          data: parsed,
          error: errMsg,
          isNetworkFailure: response.status === 0 || response.status >= 502,
        };
      }

      if (reportErrors) {
        reportNetworkHealthy();
      }

      return {
        ok: true,
        status: response.status,
        data: parsed,
        error: null,
        isNetworkFailure: false,
      };
    } catch (err) {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);

      if (externalSignal?.aborted) {
        return {
          ok: false,
          status: 0,
          data: null,
          error: 'Request cancelled.',
          isNetworkFailure: false,
        };
      }

      if (attempt < maxRetries) {
        attempt += 1;
        await new Promise((r) => setTimeout(r, 450 * attempt));
        continue;
      }

      const friendly = getFriendlyNetworkErrorMessage(err);
      if (reportErrors) {
        reportNetworkIssue(friendly);
      }

      return {
        ok: false,
        status: 0,
        data: null,
        error: friendly,
        isNetworkFailure: true,
      };
    }
  }

  return {
    ok: false,
    status: 0,
    data: null,
    error: 'Network request failed after retries.',
    isNetworkFailure: true,
  };
}
