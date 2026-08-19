import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '@components/Button';
import { ProgressBar } from '@components/ProgressBar';
import { WorldArtwork } from '@components/WorldArtwork';
import { colors, elevation, fontFamily, radius, spacing, themeForWorldId } from '@constants/tokens';
import type { ExplorerCollection } from '@features/collection/types';

interface Props {
  collection: ExplorerCollection;
  onContinue: () => void;
}

export function FeaturedCollection({ collection, onContinue }: Props) {
  const theme = themeForWorldId(collection.world.themeKey);
  const completed = collection.status === 'completed';
  const nextDiscovery = collection.discoveries.find(
    (discovery) => !collection.discoveredIds.has(discovery.id),
  );

  return (
    <View
      style={[elevation.raised, { borderRadius: radius.xl, backgroundColor: theme.background }]}
    >
      <View style={{ minHeight: 390, borderRadius: radius.xl, overflow: 'hidden' }}>
        <View style={{ height: 220 }}>
          <WorldArtwork worldId={collection.world.themeKey} width="100%" height="100%" />
          <LinearGradient
            colors={['transparent', `${colors.ink900}CC`]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 88 }}
          />
          <Text
            style={{
              position: 'absolute',
              left: spacing.xl,
              bottom: spacing.lg,
              color: colors.surface,
              fontFamily: fontFamily.displaySemiBold,
              fontSize: 28,
            }}
          >
            {collection.pack.title}
          </Text>
        </View>
        <View style={{ backgroundColor: colors.surface, padding: spacing.xl, gap: spacing.lg }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <Text
              style={{
                flex: 1,
                color: colors.ink600,
                fontFamily: fontFamily.bodySemiBold,
                fontSize: 16,
              }}
            >
              {completed
                ? `All ${collection.totalCount} discoveries found`
                : `${collection.discoveredCount} of ${collection.totalCount} discoveries found`}
            </Text>
            {completed ? (
              <View
                style={{
                  borderRadius: radius.pill,
                  backgroundColor: colors.sunshine50,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                }}
              >
                <Text
                  style={{
                    color: colors.sunshine700,
                    fontFamily: fontFamily.bodyExtraBold,
                    fontSize: 12,
                  }}
                >
                  World complete
                </Text>
              </View>
            ) : null}
          </View>
          <ProgressBar progress={collection.progress} color={theme.primary} />
          <Button
            label={
              completed
                ? `Visit ${collection.world.title} Again`
                : collection.discoveredCount > 0
                  ? nextDiscovery
                    ? `Continue with ${nextDiscovery.title}`
                    : `Visit ${collection.world.title}`
                  : nextDiscovery
                    ? `Start with ${nextDiscovery.title}`
                    : `Visit ${collection.world.title}`
            }
            color={theme.primary}
            onPress={onContinue}
          />
        </View>
      </View>
    </View>
  );
}
