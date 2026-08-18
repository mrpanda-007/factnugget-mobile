/**
 * Typed accessor for EXPO_PUBLIC_ environment variables (see .env.example).
 * No secrets belong here — EXPO_PUBLIC_ vars are inlined into the client
 * bundle. Firebase client configuration is read and validated centrally by
 * infrastructure/firebase so an unconfigured local-only build remains safe.
 */
export const env = {
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
} as const;
