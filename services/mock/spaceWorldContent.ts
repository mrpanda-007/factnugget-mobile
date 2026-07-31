import type { Category } from '@app-types/Category';
import type { Deck } from '@app-types/Deck';
import type { Discovery } from '@app-types/Discovery';

/**
 * Temporary mock content — see services/mock/oceanWorldContent.ts for the
 * full rationale. This pack proves the design system generalizes beyond
 * Ocean (docs/design/01-screen-map.md Slice D) and is the brief's example
 * paid pack (docs/product/03-monetisation-strategy.md), so `isFree: false`
 * on the deck — see types/Deck.ts.
 */

const PUBLISHED_AT = '2026-01-01T00:00:00.000Z';

export const spaceCategory: Category = {
  id: 'space',
  title: 'Space World',
  tagline: 'Blast off to planets, stars, and galaxies.',
  deckIds: ['space-adventures'],
  version: '1.0.0',
  status: 'published',
};

export const spaceAdventuresDeck: Deck = {
  id: 'space-adventures',
  slug: 'space-adventures',
  title: 'Space Adventures',
  subtitle: 'Discover 4 wonders of outer space.',
  category: 'space',
  displayOrder: 1,
  discoveryIds: ['sun', 'moon', 'saturn', 'space-station'],
  rewardBadge: { icon: '🚀', label: 'Space Explorer Badge' },
  isFree: false,
  version: '1.0.0',
  status: 'published',
};

export const spaceDiscoveries: Discovery[] = [
  {
    id: 'sun',
    slug: 'sun',
    title: 'The Sun',
    subtitle: 'Our own giant star',
    category: 'space',
    deck: 'space-adventures',
    displayOrder: 1,
    heroImage: null,
    emoji: '☀️',
    funFact: 'You could fit over one million Earths inside the Sun!',
    easyDescription:
      "The Sun is a giant, glowing ball of hot gas called a star, and it's the closest star to our planet.",
    mediumDescription:
      'Even though it looks small in the sky, the Sun is so enormous that about one million Earths could fit inside it.',
    advancedDescription:
      "The Sun's surface is about 5,500°C, but its core reaches nearly 15 million°C — hot enough to fuse hydrogen into helium, which is what makes it shine.",
    stickerReward: { icon: '🔥', label: 'Solar Flare Sticker' },
    discoveryReward: { icon: '☀️', label: 'The Sun' },
    estimatedReadingTime: 30,
    tags: ['space', 'planets', 'stars'],
    difficultyLevels: ['easy', 'medium', 'advanced'],
    narration: { narrationUrl: null, narrationDuration: null, transcript: null },
    quiz: { quizEnabled: false, quizQuestions: null, quizAnswers: null },
    version: '1.0.0',
    status: 'published',
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
  },
  {
    id: 'moon',
    slug: 'moon',
    title: 'The Moon',
    subtitle: "Earth's quiet companion",
    category: 'space',
    deck: 'space-adventures',
    displayOrder: 2,
    heroImage: null,
    emoji: '🌙',
    funFact: 'The Moon is slowly moving away from Earth!',
    easyDescription:
      'Every year, the Moon drifts a few centimeters farther from Earth — about as fast as your fingernails grow.',
    mediumDescription:
      "The Moon doesn't make its own light — we only see it shine because it reflects sunlight.",
    advancedDescription:
      'The same side of the Moon always faces Earth, because the Moon\'s rotation is perfectly matched, or "tidally locked," to how long it takes to orbit us.',
    stickerReward: { icon: '🌗', label: 'Moon Phase Sticker' },
    discoveryReward: { icon: '🌙', label: 'The Moon' },
    estimatedReadingTime: 30,
    tags: ['space', 'moon'],
    difficultyLevels: ['easy', 'medium', 'advanced'],
    narration: { narrationUrl: null, narrationDuration: null, transcript: null },
    quiz: { quizEnabled: false, quizQuestions: null, quizAnswers: null },
    version: '1.0.0',
    status: 'published',
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
  },
  {
    id: 'saturn',
    slug: 'saturn',
    title: 'Saturn',
    subtitle: 'The planet with rings',
    category: 'space',
    deck: 'space-adventures',
    displayOrder: 3,
    heroImage: null,
    emoji: '🪐',
    funFact: 'Saturn is so light, it could float in a giant bathtub!',
    easyDescription:
      "Saturn is made mostly of gas, and it's so much lighter than Earth that if you had a bathtub big enough, it would actually float.",
    mediumDescription:
      "Saturn's beautiful rings are made of billions of pieces of ice and rock — some as small as a grain of sand, others as big as a house.",
    advancedDescription:
      'Saturn has more than 140 known moons circling it, more than any other planet in our solar system.',
    stickerReward: { icon: '💍', label: 'Ringed Planet Sticker' },
    discoveryReward: { icon: '🪐', label: 'Saturn' },
    estimatedReadingTime: 30,
    tags: ['space', 'planets'],
    difficultyLevels: ['easy', 'medium', 'advanced'],
    narration: { narrationUrl: null, narrationDuration: null, transcript: null },
    quiz: { quizEnabled: false, quizQuestions: null, quizAnswers: null },
    version: '1.0.0',
    status: 'published',
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
  },
  {
    id: 'space-station',
    slug: 'space-station',
    title: 'Space Station',
    subtitle: 'A science lab high above Earth',
    category: 'space',
    deck: 'space-adventures',
    displayOrder: 4,
    heroImage: null,
    emoji: '🛰️',
    funFact: 'Astronauts on the Space Station see 16 sunrises every day!',
    easyDescription:
      'The Space Station zooms around Earth so fast that astronauts inside see the sun rise and set 16 times in a single day.',
    mediumDescription:
      'It orbits about 400 kilometers above Earth, circling the whole planet in roughly 90 minutes.',
    advancedDescription:
      'The International Space Station is a science lab built by astronauts from many countries working together — people have lived aboard it continuously since the year 2000.',
    stickerReward: { icon: '🧑‍🚀', label: 'Astronaut Sticker' },
    discoveryReward: { icon: '🛰️', label: 'Space Station' },
    estimatedReadingTime: 30,
    tags: ['space', 'space missions'],
    difficultyLevels: ['easy', 'medium', 'advanced'],
    narration: { narrationUrl: null, narrationDuration: null, transcript: null },
    quiz: { quizEnabled: false, quizQuestions: null, quizAnswers: null },
    version: '1.0.0',
    status: 'published',
    publishedAt: PUBLISHED_AT,
    updatedAt: PUBLISHED_AT,
  },
];
