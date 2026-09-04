import { usePathname } from 'expo-router';
import { useEffect } from 'react';

import { setObservabilityTags } from '@/lib/observability';
import { usePro } from '@/lib/purchases';
import { enableTelemetry, registerContext, screen } from '@/lib/telemetry';
import { useWeightUnit } from '@/lib/weight-unit';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Renders nothing. Lives next to `NoticeHost` so it sits inside the providers it
 * reads, and so the client stays a module singleton the action files can call
 * without a context.
 */
export function TelemetrySync() {
  const isPro = usePro();
  const weightUnit = useWeightUnit();
  const pathname = usePathname();

  useEffect(() => {
    enableTelemetry();
  }, []);

  useEffect(() => {
    registerContext({ isPro, weightUnit });
    setObservabilityTags({ is_pro: isPro, weight_unit: weightUnit });
  }, [isPro, weightUnit]);

  useEffect(() => {
    screen(normalize(pathname));
  }, [pathname]);

  return null;
}

/**
 * Screens, not URLs: an id in the path would turn one screen into thousands.
 * PostHog's own `captureScreens` can't do this here — it only supports
 * @react-navigation/native v6 and below, and expo-router on SDK 57 is on v7.
 */
function normalize(pathname: string): string {
  const segments = pathname.split('/').map((segment) => (UUID.test(segment) ? ':id' : segment));
  return segments.join('/') || '/';
}
