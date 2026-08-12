import { useCallback } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@components/Button';
import { ProgressBar } from '@components/ProgressBar';
import { WorldBackground } from '@components/WorldBackground';
import { DiscoveryIllustration } from '@features/collection/components/DiscoveryIllustration';
import { colors, elevation, fontFamily, radius, spacing, worldThemes } from '@constants/tokens';
import { useWorldHome } from '@features/explore/hooks/useWorldHome';
import * as ProgressRepository from '@repositories/ProgressRepository';
import type { ExploreScreenProps } from '@navigation/types';

export function WorldHomeScreen({ route, navigation }: ExploreScreenProps<'WorldHome'>) {
  const { worldId } = route.params;
  const theme = worldThemes[worldId];
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    isLoading,
    category,
    deck,
    deckProgress,
    discoveries,
    collectionPreview,
    nextDiscovery,
    refresh,
  } = useWorldHome(worldId);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const completedIds = new Set(deckProgress?.completedDiscoveryIds ?? []);
  const discoveredCount = deckProgress?.completedDiscoveryIds.length ?? 0;
  const worldName = (category?.title ?? theme.label).replace(' World', '');
  const worldTitle = category?.title ?? theme.label;
  const worldCompleted = Boolean(deckProgress?.completedAt);
  const actionLabel = worldCompleted
    ? `VISIT MY ${worldName.toLocaleUpperCase()} DISCOVERIES`
    : discoveredCount > 0 && nextDiscovery
      ? `CONTINUE WITH ${nextDiscovery.title.toLocaleUpperCase()}`
      : nextDiscovery
        ? `START WITH ${nextDiscovery.title.toLocaleUpperCase()}`
        : 'START DISCOVERING';

  const handlePrimaryAction = async () => {
    if (!deck) return;
    if (worldCompleted) {
      navigation.navigate('Collection');
      return;
    }
    await ProgressRepository.startOrTouchDeck(deck.id);
    navigation.navigate('DiscoveryCard', {
      deckId: deck.id,
      discoveryId: nextDiscovery?.id,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <WorldBackground world={theme} intensity="subtle" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: width >= 700 ? spacing['2xl'] : spacing.lg,
          paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing['3xl'],
          gap: spacing.xl,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Explore"
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={{ minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center' }}
        >
          <Text
            style={{ color: theme.primary, fontFamily: fontFamily.bodyExtraBold, fontSize: 16 }}
          >
            ← Explore
          </Text>
        </Pressable>

        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontSize: 44 }}>{theme.emoji}</Text>
          <Text
            style={{
              color: colors.ink900,
              fontFamily: fontFamily.displayBold,
              fontSize: width >= 700 ? 38 : 32,
              lineHeight: width >= 700 ? 46 : 39,
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          >
            {worldTitle}
          </Text>
          <Text
            style={{
              maxWidth: 480,
              color: colors.ink600,
              fontFamily: fontFamily.bodyRegular,
              fontSize: 17,
              lineHeight: 24,
              textAlign: 'center',
            }}
          >
            {category?.tagline ?? `Discover something amazing in ${worldTitle}.`}
          </Text>
        </View>

        {!isLoading && deck ? (
          <View
            style={[
              elevation.raised,
              {
                borderRadius: radius.xl,
                padding: spacing.xl,
                gap: spacing.lg,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <View style={{ gap: spacing.xs }}>
              <Text
                style={{
                  color: theme.primary,
                  fontFamily: fontFamily.bodyExtraBold,
                  fontSize: 14,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                }}
              >
                Ready to Discover
              </Text>
              <Text
                style={{
                  color: colors.ink900,
                  fontFamily: fontFamily.displaySemiBold,
                  fontSize: 27,
                }}
              >
                {deck.title}
              </Text>
              <Text
                style={{ color: colors.ink600, fontFamily: fontFamily.bodySemiBold, fontSize: 16 }}
              >
                {deck.discoveryIds.length} discoveries
              </Text>
            </View>

            {deckProgress ? (
              <ProgressBar
                progress={deck.discoveryIds.length ? discoveredCount / deck.discoveryIds.length : 0}
                color={theme.primary}
                label={`${discoveredCount} of ${deck.discoveryIds.length} discovered`}
              />
            ) : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              {discoveries.map((discovery) => {
                const discovered = completedIds.has(discovery.id);
                return (
                  <View
                    key={discovery.id}
                    accessible
                    accessibilityLabel={`${discovery.title}. ${discovered ? 'In My Discoveries.' : 'Waiting to be discovered.'}`}
                    style={{
                      width: width >= 520 ? '22%' : '47%',
                      minWidth: 118,
                      flexGrow: 1,
                      alignItems: 'center',
                      gap: spacing.sm,
                      borderRadius: radius.lg,
                      padding: spacing.md,
                      backgroundColor: theme.background,
                    }}
                  >
                    <DiscoveryIllustration
                      discovery={discovery}
                      size={Math.min(width >= 520 ? 82 : 96, width * 0.24)}
                      hidden={!discovered}
                    />
                    <Text
                      style={{
                        color: colors.ink900,
                        fontFamily: fontFamily.bodyExtraBold,
                        fontSize: 15,
                        textAlign: 'center',
                      }}
                    >
                      {discovery.title}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Button
              label={actionLabel}
              size="large"
              color={theme.primary}
              onPress={handlePrimaryAction}
            />
          </View>
        ) : null}

        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={{
                flex: 1,
                color: colors.ink900,
                fontFamily: fontFamily.displaySemiBold,
                fontSize: 22,
              }}
            >
              My {worldName} Discoveries
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="See all My Discoveries"
              onPress={() => navigation.navigate('Collection')}
              hitSlop={8}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text
                style={{ color: theme.primary, fontFamily: fontFamily.bodyExtraBold, fontSize: 15 }}
              >
                See all
              </Text>
            </Pressable>
          </View>

          {collectionPreview.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              {collectionPreview.map((discovery) => (
                <Pressable
                  key={discovery.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${discovery.title}. Open My Discoveries.`}
                  onPress={() => navigation.navigate('Collection')}
                  style={({ pressed }) => [
                    elevation.resting,
                    {
                      width: width >= 520 ? 150 : '47%',
                      flexGrow: 1,
                      alignItems: 'center',
                      gap: spacing.sm,
                      borderRadius: radius.lg,
                      padding: spacing.md,
                      backgroundColor: colors.surface,
                      opacity: pressed ? 0.86 : 1,
                    },
                  ]}
                >
                  <DiscoveryIllustration discovery={discovery} size={92} />
                  <Text
                    style={{
                      color: colors.ink900,
                      fontFamily: fontFamily.bodyExtraBold,
                      fontSize: 16,
                    }}
                  >
                    {discovery.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View
              style={{
                borderRadius: radius.lg,
                padding: spacing.lg,
                gap: spacing.xs,
                backgroundColor: colors.surface,
              }}
            >
              <Text
                style={{ color: colors.ink600, fontFamily: fontFamily.bodySemiBold, fontSize: 16 }}
              >
                Your {worldName} discoveries will appear here.
              </Text>
              {nextDiscovery ? (
                <Text
                  style={{
                    color: theme.primary,
                    fontFamily: fontFamily.bodyExtraBold,
                    fontSize: 16,
                  }}
                >
                  Start with {nextDiscovery.title}.
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
