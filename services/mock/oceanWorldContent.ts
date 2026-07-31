import type { Category } from '@app-types/Category';
import type { Deck } from '@app-types/Deck';
import type { Discovery } from '@app-types/Discovery';

/**
 * Temporary mock content — docs/design/README context: no Sanity project
 * exists yet (self-plan.md Phase 5 unstarted). Shaped exactly like
 * docs/implementation/05-content-schema.md so ContentService's real,
 * Sanity-backed implementation is a drop-in replacement with zero UI change.
 *
 * Facts are real and fact-checked, not placeholder lorem ipsum — this is
 * meant to be usable as real launch content for the Ocean pack, not just a
 * UI prop.
 */

const PUBLISHED_AT = '2026-01-01T00:00:00.000Z';

export const oceanCategory: Category = {
  id: 'ocean',
  title: 'Ocean World',
  tagline: 'Dive into ocean secrets waiting to be found.',
  deckIds: ['ocean-secrets'],
  version: '1.0.0',
  status: 'published',
};

export const oceanSecretsDeck: Deck = {
  id: 'ocean-secrets',
  slug: 'ocean-secrets',
  title: 'Ocean Secrets',
  subtitle: 'Discover 4 amazing ocean creatures.',
  category: 'ocean',
  displayOrder: 1,
  discoveryIds: ['octopus', 'blue-whale', 'shark', 'dolphin'],
  rewardBadge: { icon: '🏆', label: 'Ocean Explorer Badge' },
  isFree: true,
  version: '1.0.0',
  status: 'published',
};

export const oceanDiscoveries: Discovery[] = [
  {
    id: 'octopus',
    slug: 'octopus',
    title: 'Octopus',
    subtitle: 'The eight-armed genius of the reef',
    category: 'ocean',
    deck: 'ocean-secrets',
    displayOrder: 1,
    heroImage: null,
    emoji: '🐙',
    funFact: 'An octopus has three hearts!',
    easyDescription:
      'Two hearts pump blue blood to its gills, and one heart pumps blood to the rest of its body.',
    mediumDescription:
      'When an octopus swims, the heart that serves its body actually stops beating — which is one reason octopuses prefer crawling along the seafloor instead of swimming.',
    advancedDescription:
      'Octopus blood is blue, not red, because it carries oxygen with a copper-based molecule called hemocyanin instead of the iron-based hemoglobin found in human blood.',
    stickerReward: { icon: '💙', label: 'Triple Heart Sticker' },
    discoveryReward: { icon: '🐙', label: 'Octopus' },
    estimatedReadingTime: 30,
    tags: ['ocean', 'animals', 'sea creatures'],
    difficultyLevels: ['easy', 'medium', 'advanced'],
    narration: { narrationUrl: null, narrationDuration: null, transcript: null },
    quiz: { quizEnabled: false, quizQuestions: null, quizAnswers: null },
    version: '1.0.0',
    status: 'published',
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
  },
  {
    id: 'blue-whale',
    slug: 'blue-whale',
    title: 'Blue Whale',
    subtitle: 'The largest animal ever to live',
    category: 'ocean',
    deck: 'ocean-secrets',
    displayOrder: 2,
    heroImage: null,
    emoji: '🐋',
    funFact: "A blue whale's heart is as big as a small car!",
    easyDescription:
      'Blue whales are the largest animals to have ever lived on Earth — even bigger than the biggest dinosaurs.',
    mediumDescription:
      'Its heart alone can weigh as much as a small car, and just one beat can travel for miles through the deep ocean.',
    advancedDescription:
      "A blue whale's tongue can weigh as much as an elephant, and during feeding season it can eat several tons of tiny shrimp-like krill in a single day.",
    stickerReward: { icon: '🎵', label: 'Whale Song Sticker' },
    discoveryReward: { icon: '🐋', label: 'Blue Whale' },
    estimatedReadingTime: 30,
    tags: ['ocean', 'animals', 'sea creatures'],
    difficultyLevels: ['easy', 'medium', 'advanced'],
    narration: { narrationUrl: null, narrationDuration: null, transcript: null },
    quiz: { quizEnabled: false, quizQuestions: null, quizAnswers: null },
    version: '1.0.0',
    status: 'published',
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
  },
  {
    id: 'shark',
    slug: 'shark',
    title: 'Shark',
    subtitle: 'Older than trees, faster than fear',
    category: 'ocean',
    deck: 'ocean-secrets',
    displayOrder: 3,
    heroImage: null,
    emoji: '🦈',
    funFact: 'Sharks have been swimming in our oceans longer than trees have existed on land!',
    easyDescription: 'Sharks appeared over 400 million years ago — way before the dinosaurs.',
    mediumDescription:
      'Most sharks also never stop growing new teeth — a single shark can go through thousands of teeth over its lifetime.',
    advancedDescription:
      "Sharks don't have any bones at all — their entire skeleton is made of cartilage, the same bendy material as your ears and nose.",
    stickerReward: { icon: '🦷', label: 'Shark Tooth Sticker' },
    discoveryReward: { icon: '🦈', label: 'Shark' },
    estimatedReadingTime: 30,
    tags: ['ocean', 'animals', 'sea creatures'],
    difficultyLevels: ['easy', 'medium', 'advanced'],
    narration: { narrationUrl: null, narrationDuration: null, transcript: null },
    quiz: { quizEnabled: false, quizQuestions: null, quizAnswers: null },
    version: '1.0.0',
    status: 'published',
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
  },
  {
    id: 'dolphin',
    slug: 'dolphin',
    title: 'Dolphin',
    subtitle: 'The ocean’s clever chatterbox',
    category: 'ocean',
    deck: 'ocean-secrets',
    displayOrder: 4,
    heroImage: null,
    emoji: '🐬',
    funFact: 'Dolphins call each other by name!',
    easyDescription:
      'Every dolphin makes its own special whistle sound, kind of like a name, so other dolphins know exactly who is calling.',
    mediumDescription:
      'Dolphins also sleep with only half of their brain at a time, so they can keep breathing and watch for danger while they rest.',
    advancedDescription:
      'Scientists believe dolphins can recognize themselves in a mirror — a rare sign of self-awareness shared by very few animals on Earth.',
    stickerReward: { icon: '🎶', label: 'Dolphin Whistle Sticker' },
    discoveryReward: { icon: '🐬', label: 'Dolphin' },
    estimatedReadingTime: 30,
    tags: ['ocean', 'animals', 'sea creatures'],
    difficultyLevels: ['easy', 'medium', 'advanced'],
    narration: { narrationUrl: null, narrationDuration: null, transcript: null },
    quiz: { quizEnabled: false, quizQuestions: null, quizAnswers: null },
    version: '1.0.0',
    status: 'published',
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
  },
];
