import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

/**
 * The Sanity CDN client.
 *
 * ⚠️ ARCHITECTURAL BOUNDARY — read before importing this file.
 *
 * docs/implementation/04-content-platform.md is explicit: "The UI must never
 * communicate directly with Sanity." The only legitimate importer of this
 * module is `services/sanity/contentSource.ts`, which sits behind
 * ContentService, which sits behind ContentRepository:
 *
 *   UI → ContentRepository → ContentService → SQLite cache → Sanity CDN
 *
 * A screen that imports this client bypasses the offline cache, and an
 * offline-first children's app that fetches at render time is an app that
 * shows a spinner on a train. Don't.
 */

const projectId = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.EXPO_PUBLIC_SANITY_DATASET;

/**
 * Whether this build has Sanity credentials at all.
 *
 * Exported so `ContentService` can fall back to bundled mock content rather
 * than crash. Phase 1 of this project ships with no backend
 * (docs/implementation/12-build-rules.md), and a developer who has not created
 * a `.env` should still get a working app.
 */
export const isSanityConfigured = Boolean(projectId && dataset);

/**
 * Lazily constructed, so that merely importing this module cannot throw.
 * Module-scope side effects are a poor fit for React Native, where an
 * exception during import surfaces as an unhelpful bundler-level failure
 * rather than an error you can catch and degrade from.
 */
let cachedClient: ReturnType<typeof createClient> | null = null;

export function getSanityClient() {
  if (!projectId || !dataset) {
    throw new Error(
      'Sanity is not configured. Set EXPO_PUBLIC_SANITY_PROJECT_ID and EXPO_PUBLIC_SANITY_DATASET (copy .env.example to .env).',
    );
  }

  if (!cachedClient) {
    cachedClient = createClient({
      projectId,
      dataset,
      /**
       * Pinned, not "today's date". An API version is a compatibility contract
       * — letting it float means a Sanity-side behaviour change can alter query
       * results in an app already installed on a child's tablet, with no
       * release on our side. Bump deliberately, and re-test the sync engine
       * when you do.
       */
      apiVersion: '2026-05-15',
      /**
       * The CDN is the right choice here, unlike in a server-rendered web app:
       * content is public, edits reach devices through the sync engine's
       * version check rather than through cache freshness, and CDN reads are
       * both faster and cheaper at mobile scale.
       */
      useCdn: true,
      perspective: 'published',
    });
  }

  return cachedClient;
}

let cachedBuilder: ReturnType<typeof imageUrlBuilder> | null = null;

function getBuilder() {
  if (!cachedBuilder) cachedBuilder = imageUrlBuilder(getSanityClient());
  return cachedBuilder;
}

/**
 * Builds a CDN URL for a Sanity image reference.
 *
 * Sizing happens here rather than on device: shipping a 3000px hero to a phone
 * costs a family's mobile data and then costs battery to downscale. Ask the CDN
 * for what the screen actually needs.
 */
export function buildImageUrl(
  ref: string | null | undefined,
  options: { width?: number; height?: number; quality?: number } = {},
): string | null {
  if (!ref || !isSanityConfigured) return null;

  const { width = 800, height, quality = 80 } = options;
  let url = getBuilder().image(ref).width(width).quality(quality).auto('format');
  if (height) url = url.height(height);

  return url.url();
}
