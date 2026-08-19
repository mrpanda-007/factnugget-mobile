/**
 * Every value here MUST be read as a literal `process.env.EXPO_PUBLIC_*`
 * member expression: babel-preset-expo statically substitutes those at bundle
 * time, and there is no populated `process.env` on device at runtime. Reading
 * through a dynamic key silently yields undefined in a release build — this
 * exact bug shipped once already in application/release/legalLinks.ts (Phase
 * 11C.1) and was only caught by inspecting the built bundle, not by unit
 * tests. Keep the literal form here even though it looks repetitive.
 */
const BUNDLED_ENV = {
  EXPO_PUBLIC_SANITY_PROJECT_ID: process.env.EXPO_PUBLIC_SANITY_PROJECT_ID,
  EXPO_PUBLIC_SANITY_DATASET: process.env.EXPO_PUBLIC_SANITY_DATASET,
};

export interface SanityEnv {
  projectId: string | null;
  /** The dataset this build's env asks for — routing policy lives in contentRuntime, not here. */
  configuredDataset: string | null;
}

export function getSanityEnv(
  environment: Record<string, string | undefined> = BUNDLED_ENV,
): SanityEnv {
  const projectId = environment.EXPO_PUBLIC_SANITY_PROJECT_ID?.trim() || null;
  const configuredDataset = environment.EXPO_PUBLIC_SANITY_DATASET?.trim() || null;
  return { projectId, configuredDataset };
}

/**
 * Pinned to match studio-factnuggets/lib/constants.ts SANITY_API_VERSION
 * exactly. The two repos cannot share a literal import, so bumping one
 * without the other is a real drift risk — grep both repos for this string
 * before changing it, and re-test the content pipeline when you do.
 */
export const SANITY_API_VERSION = '2026-05-15';
