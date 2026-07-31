/**
 * Typed accessor for EXPO_PUBLIC_ environment variables (see .env.example).
 * No secrets belong here — EXPO_PUBLIC_ vars are inlined into the client
 * bundle. Firebase/Sanity config is added in later phases, not here.
 */
export const env = {
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
} as const;
