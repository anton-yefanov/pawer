import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

import { notice, type NoticeOptions } from '@/lib/notice';

/** Flip to true to send events from a dev build while checking the wiring. */
const REPORT_IN_DEV = false;

const config = (Constants.expoConfig?.extra?.sentry ?? {}) as { dsn?: string };

/**
 * Scopes are the fingerprint, so Sentry groups by the operation that failed
 * rather than by whichever Drizzle or ActivityKit frame happened to throw.
 * Keeping them in one union stops the same failure arriving under three names.
 */
export type Scope =
  | 'app'
  | 'database'
  | 'migrations'
  | 'seed'
  | 'workout'
  | 'sets'
  | 'personal-records'
  | 'templates'
  | 'folders'
  | 'exercises'
  | 'photos'
  | 'media'
  | 'settings'
  | 'onboarding'
  | 'notifications'
  | 'rest-timer'
  | 'finish-reminder'
  | 'live-activity'
  | 'purchases'
  | 'paywall'
  | 'pro-gates'
  | 'achievements'
  | 'support';

type Tags = Record<string, string | number | boolean>;

/** Long enough for a cold radio in a gym basement, short enough to wait on. */
const FEEDBACK_FLUSH_MS = 8000;

export function initObservability(): void {
  if (!config.dsn) {
    console.warn('[observability] no sentry.dsn in app.json extra; crash reporting is off');
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    enabled: !__DEV__ || REPORT_IN_DEV,
    environment: __DEV__ ? 'development' : 'production',
    // The Settings screen promises workouts, notes and photos never leave the
    // phone. `scrub` below is what keeps that literally true, so PII the SDK
    // would otherwise attach on its own has to stay off.
    sendDefaultPii: false,
    enableLogs: true,
    attachStacktrace: true,
    tracesSampleRate: __DEV__ ? 1 : 0.2,
    enableNativeFramesTracking: true,
    integrations: [Sentry.expoRouterIntegration({ enableTimeToInitialDisplay: true })],
    beforeSend: scrub,
    beforeBreadcrumb: scrubBreadcrumb,
  });
}

/**
 * Every reporting entry point is total. A throw from inside error reporting is
 * the one thing that turns a recoverable failure into a crash.
 */
export function report(scope: Scope, error: unknown, tags?: Tags): void {
  if (__DEV__) console.warn(`[${scope}]`, error);
  try {
    Sentry.withScope((sentryScope) => {
      sentryScope.setTag('scope', scope);
      sentryScope.setFingerprint(['{{ default }}', scope]);
      if (tags) sentryScope.setTags(tags);
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
    });
  } catch {
    // Nothing left to report it to.
  }
}

/**
 * For a promise whose value the caller wants. `undefined` means it failed —
 * which is why the void-returning writes use `attempt` instead: `Promise<void>`
 * resolves to `undefined` on success too, so a caller checking the value here
 * would treat every write as a failure.
 */
export async function guard<T>(
  scope: Scope,
  work: Promise<T>,
  onFail?: NoticeOptions,
  tags?: Tags
): Promise<T | undefined> {
  try {
    return await work;
  } catch (error) {
    report(scope, error, tags);
    if (onFail) notice(onFail);
    return undefined;
  }
}

/**
 * The replacement for `void someDbAction()`, and the answer to "did it land?".
 * Without `onFail` a failed write stays silent to the user — right for a
 * preference read, wrong for anything they typed, so the notice is explicit at
 * every call site.
 */
export async function attempt(
  scope: Scope,
  work: Promise<unknown>,
  onFail?: NoticeOptions,
  tags?: Tags
): Promise<boolean> {
  try {
    await work;
    return true;
  } catch (error) {
    report(scope, error, tags);
    if (onFail) notice(onFail);
    return false;
  }
}

/**
 * A support message, on the same envelope the crash reports use — there is no
 * backend to send it to and this app makes no HTTP calls of its own.
 *
 * Two things are worth knowing here. `scrub` never sees this event: in
 * `@sentry/core` v8 `beforeSend` runs for error events only, which is what lets
 * the address the user typed survive to the inbox that has to reply to it.
 * And `captureFeedback` only enqueues, so the flush is what turns a
 * fire-and-forget envelope into an answer to "did it send?" worth showing.
 */
export async function captureFeedback(feedback: {
  name?: string;
  email?: string;
  message: string;
}): Promise<boolean> {
  try {
    // Nothing to report a missing client to.
    const client = Sentry.getClient();
    if (!client) return false;

    Sentry.captureFeedback({ ...feedback, associatedEventId: Sentry.lastEventId() });
    // `Sentry.flush()` takes no timeout and drains the whole buffer, so the
    // client's own is used instead — a dead connection has to give an answer.
    const flushed = await client.flush(FEEDBACK_FLUSH_MS);
    if (!flushed) report('support', new Error('feedback flush timed out'));
    return flushed;
  } catch (error) {
    report('support', error, { phase: 'capture-feedback' });
    return false;
  }
}

/** Same contract as `guard`, for the sync native calls that throw through JSI. */
export function guardSync<T>(scope: Scope, work: () => T, tags?: Tags): T | undefined {
  try {
    return work();
  } catch (error) {
    report(scope, error, tags);
    return undefined;
  }
}

export function breadcrumb(scope: Scope, message: string, data?: Tags): void {
  try {
    Sentry.logger.info(message, { scope, ...data });
  } catch {
    // See `report`.
  }
}

export function span<T>(scope: Scope, name: string, work: () => Promise<T>): Promise<T> {
  return Sentry.startSpan({ name, op: `app.${scope}` }, work);
}

export function setObservabilityUser(id: string | null): void {
  try {
    Sentry.setUser(id ? { id } : null);
  } catch {
    // See `report`.
  }
}

export function setObservabilityTags(tags: Tags): void {
  try {
    Sentry.setTags(tags);
  } catch {
    // See `report`.
  }
}

const PATH = /\b(?:file|ph|content|assets-library):\/\/\S*?([^/\s'"]+)(?=['"\s]|$)/g;

/** A photo's filename is the user's; its basename is enough to debug with. */
function redact(value: string): string {
  return value.replace(PATH, '<path>/$1');
}

function scrub(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.user) {
    delete event.user.ip_address;
    delete event.user.email;
    delete event.user.username;
  }
  if (event.contexts?.device) delete event.contexts.device.name;

  if (event.message) event.message = redact(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = redact(exception.value);
  }

  return event;
}

function scrubBreadcrumb(crumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
  if (crumb.message) crumb.message = redact(crumb.message);
  // Touch breadcrumbs carry the rendered label of whatever was tapped, which on
  // this app is an exercise or template the user named.
  if (crumb.category === 'touch') delete crumb.data;
  return crumb;
}
