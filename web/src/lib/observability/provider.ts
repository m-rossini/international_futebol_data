import type { ObservabilityProvider } from './types';
import { OpenObserveProvider } from './openobserve-provider';
import { ConsoleProvider } from './console-provider';
import { NoopProvider } from './noop-provider';

let instance: ObservabilityProvider | null = null;

export function getProvider(): ObservabilityProvider {
  if (instance) return instance;

  // NEXT_PUBLIC_* variables are inlined by Next.js at build time.
  // They MUST be accessed as process.env.NEXT_PUBLIC_* (without optional
  // chaining) so the webpack define plugin can replace them.
  const providerName = process.env.NEXT_PUBLIC_OBS_PROVIDER || 'openobserve';

  switch (providerName) {
    case 'console':
      instance = new ConsoleProvider();
      break;
    case 'noop':
      instance = new NoopProvider();
      break;
    case 'openobserve':
    default:
      instance = new OpenObserveProvider();
      break;
  }

  return instance;
}
