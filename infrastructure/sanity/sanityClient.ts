import { createClient, type SanityClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

import { SANITY_API_VERSION } from './sanityEnv';

/**
 * ARCHITECTURAL BOUNDARY — read before importing this file.
 *
 * The only legitimate importer is infrastructure/sanity/fetchRemoteSnapshot.ts.
 * No screen, hook, or store may import this or call .fetch()/GROQ directly
 * (Phase 11C.2 §32). Everything above this file talks to
 * ContentRepositoryContract, never to Sanity.
 *
 * Read-only by construction: no token is configured, so this client has no
 * write credential to misuse even if a call site tried client.create/patch/
 * delete (Phase 11C.2 §88).
 */
export function createSanityContentClient(dataset: string, projectId: string): SanityClient {
  return createClient({
    projectId,
    dataset,
    apiVersion: SANITY_API_VERSION,
    // CDN for production traffic; disabled for the development dataset so an
    // editor sees a just-published change immediately while authoring, rather
    // than waiting out CDN propagation (Phase 11C.2 §28).
    useCdn: dataset !== 'development',
    // Never drafts. A draft is, by definition, not yet approved for a child
    // to see (Phase 11C.2 §29).
    perspective: 'published',
  });
}

let cachedBuilderClient: SanityClient | null = null;
let cachedBuilder: ReturnType<typeof imageUrlBuilder> | null = null;

/** Builds a CDN URL sized for the screen, not the original upload. */
export function buildContentImageUrl(
  client: SanityClient,
  ref: string | null | undefined,
  { width = 1200, quality = 80 }: { width?: number; quality?: number } = {},
): string | null {
  if (!ref) return null;
  if (cachedBuilderClient !== client) {
    cachedBuilder = imageUrlBuilder(client);
    cachedBuilderClient = client;
  }
  return cachedBuilder!.image(ref).width(width).quality(quality).auto('format').url();
}
