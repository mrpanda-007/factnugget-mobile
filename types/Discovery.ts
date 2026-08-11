import type { WorldId } from '@constants/tokens';

/**
 * Field-level shape per docs/implementation/05-content-schema.md#discovery-schema.
 * Mirrors the future Sanity document exactly, plus one UI-only field (`emoji`)
 * called out below — everything else here is a real schema field, not an
 * invented one.
 */

export interface DiscoveryReward {
  icon: string;
  label: string;
}

/** All nullable until narration ships — docs/implementation/05-content-schema.md#audio-future-narration */
export interface DiscoveryNarration {
  narrationUrl: string | null;
  narrationDuration: number | null;
  transcript: string | null;
}

/** Reserved, not implemented in MVP — docs/implementation/05-content-schema.md#future-quiz-support */
export interface DiscoveryQuiz {
  quizEnabled: boolean;
  quizQuestions: unknown[] | null;
  quizAnswers: unknown[] | null;
}

export type ContentStatus = 'draft' | 'published';
export type DifficultyLevel = 'easy' | 'medium' | 'advanced';

export interface Discovery {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: WorldId;
  deck: string;
  displayOrder: number;
  /** Sanity CDN URL, downloaded + cached locally per 06-content-sync-engine.md. Null until that pipeline exists. */
  heroImage: string | null;
  /**
   * UI-only placeholder-art fallback (docs/design/04-asset-strategy.md
   * "Illustration Placeholder System") — not a Sanity schema field. Always
   * present so `IllustrationStage` never has nothing to render. Drop once
   * every discovery reliably has a `heroImage`.
   */
  emoji: string;
  /**
   * UI-only, provisional — not yet in docs/implementation/05-content-schema.md.
   * 0–3 real photos for the Discovery Card's swipeable gallery
   * (components/ImageCarousel.tsx). Currently verified, freely-licensed
   * photos hotlinked from Wikimedia Commons for the mock content pass; the
   * real pipeline is Sanity-hosted images per 04-content-platform.md. Falls
   * back to the `emoji` placeholder per-slide (and entirely, if empty), so a
   * discovery with fewer than 3 — or zero — real photos still renders fine.
   * If this becomes permanent, fold it into the authoritative schema doc as
   * a proper multi-image field rather than leaving it UI-only.
   */
  images: string[];
  easyDescription: string;
  mediumDescription: string;
  advancedDescription: string;
  funFact: string;
  stickerReward: DiscoveryReward;
  discoveryReward: DiscoveryReward;
  /** Seconds. */
  estimatedReadingTime: number;
  tags: string[];
  difficultyLevels: DifficultyLevel[];
  narration: DiscoveryNarration;
  quiz: DiscoveryQuiz;
  version: string;
  status: ContentStatus;
  publishedAt: string;
  updatedAt: string;
}
