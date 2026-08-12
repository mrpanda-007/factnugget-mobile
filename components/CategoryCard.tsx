import { Text, View } from 'react-native';

import { Card } from '@components/Card';
import { ProgressBar } from '@components/ProgressBar';
import { WorldBackground } from '@components/WorldBackground';
import type { WorldTheme } from '@constants/tokens';

interface CategoryCardProps {
  world: WorldTheme;
  title: string;
  /** Short personality line — e.g. an explorer identity's description. Optional; not every use of this card needs one. */
  description?: string;
  /** 0–1, omitted if not started. */
  progress?: number;
  discoveriesFound?: number;
  discoveriesTotal?: number;
  /** Paid content not yet unlocked — docs/product/02-user-flows.md "Trigger 2". Shows a lock affordance instead of progress. */
  locked?: boolean;
  onPress: () => void;
}

/** The brief's "WorldCard" — docs/design/02-component-architecture.md#categorycard */
export function CategoryCard({
  world,
  title,
  description,
  progress,
  discoveriesFound,
  discoveriesTotal,
  locked = false,
  onPress,
}: CategoryCardProps) {
  const a11yLabel = [
    title,
    description ?? null,
    locked ? 'Grown-up preview available' : null,
    !locked && typeof progress === 'number'
      ? `${Math.round(progress * 100)} percent complete`
      : null,
    !locked && discoveriesFound ? `${discoveriesFound} discoveries found` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Card
      onPress={onPress}
      padding="lg"
      radius="xl"
      elevation="raised"
      accessibilityLabel={a11yLabel}
    >
      <WorldBackground world={world} intensity="subtle" />
      <View className={`items-center gap-sm py-md ${locked ? 'opacity-70' : ''}`}>
        <Text style={{ fontSize: 48 }}>{world.emoji}</Text>
        <Text className="text-center font-fredoka-semibold text-display-md text-ink-900">
          {title}
        </Text>
        {description ? (
          <Text className="text-center font-nunito-regular text-body-sm text-ink-600">
            {description}
          </Text>
        ) : null}
        {locked ? (
          <View className="flex-row items-center gap-xs rounded-pill bg-surface px-md py-xs">
            <Text>🔒</Text>
            <Text className="font-nunito-extrabold text-label text-ink-600">Grown-up preview</Text>
          </View>
        ) : (
          <>
            {typeof progress === 'number' ? (
              <View className="w-full px-lg">
                <ProgressBar
                  progress={progress}
                  color={world.primary}
                  label={
                    typeof discoveriesFound === 'number' && discoveriesTotal
                      ? `${discoveriesFound} of ${discoveriesTotal} discoveries`
                      : `${Math.round(progress * 100)}% complete`
                  }
                />
              </View>
            ) : null}
          </>
        )}
      </View>
    </Card>
  );
}
