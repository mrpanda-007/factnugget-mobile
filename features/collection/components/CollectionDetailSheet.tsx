import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ZoomIn, useReducedMotion } from 'react-native-reanimated';

import { Button } from '@components/Button';
import { ProgressBar } from '@components/ProgressBar';
import { WorldArtwork } from '@components/WorldArtwork';
import { DiscoveryIllustration } from '@features/collection/components/DiscoveryIllustration';
import { usePressScale } from '@hooks/usePressScale';
import {
  animationDurations,
  colors,
  elevation,
  fontFamily,
  radius,
  spacing,
  worldThemes,
} from '@constants/tokens';
import type { Discovery } from '@app-types/Discovery';
import type { ExplorerCollection } from '@features/collection/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function DiscoveryObject({
  discovery,
  discovered,
  isNew,
  width,
  onPress,
}: {
  discovery: Discovery;
  discovered: boolean;
  isNew: boolean;
  width: number;
  onPress: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.97);
  const body = (
    <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.md }}>
      <DiscoveryIllustration
        discovery={discovery}
        size={Math.min(108, width - spacing.xl)}
        hidden={!discovered}
      />
      {isNew ? (
        <Text
          style={{
            color: colors.sunshine700,
            fontFamily: fontFamily.bodyExtraBold,
            fontSize: 13,
            textTransform: 'uppercase',
          }}
        >
          New discovery
        </Text>
      ) : null}
      <Text
        style={{
          color: discovered ? colors.ink900 : colors.ink600,
          fontFamily: discovered ? fontFamily.bodyExtraBold : fontFamily.bodySemiBold,
          fontSize: 16,
          textAlign: 'center',
        }}
      >
        {discovered ? discovery.title : 'A mystery awaits'}
      </Text>
      {isNew && discovered ? (
        <>
          <Text
            style={{
              color: colors.ink600,
              fontFamily: fontFamily.bodyRegular,
              fontSize: 15,
              lineHeight: 21,
              textAlign: 'center',
            }}
          >
            {discovery.funFact}
          </Text>
          <Text
            style={{ color: colors.ocean700, fontFamily: fontFamily.bodyExtraBold, fontSize: 14 }}
          >
            Tap to remember →
          </Text>
        </>
      ) : null}
    </View>
  );

  if (!discovered) {
    return (
      <View
        accessible
        accessibilityLabel="Unknown discovery. Keep exploring to discover it."
        style={[
          elevation.resting,
          { width, minHeight: 168, borderRadius: radius.lg, backgroundColor: colors.surface },
        ]}
      >
        {body}
      </View>
    );
  }

  return (
    <AnimatedPressable
      entering={
        isNew
          ? reducedMotion
            ? FadeIn.duration(animationDurations.fast)
            : ZoomIn.duration(animationDurations.celebration)
          : undefined
      }
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`${discovery.title}. ${discovery.funFact}. Tap to remember this discovery.`}
      style={[
        elevation.resting,
        animatedStyle,
        { width, minHeight: 168, borderRadius: radius.lg, backgroundColor: colors.surface },
      ]}
    >
      {body}
    </AnimatedPressable>
  );
}

interface Props {
  collection: ExplorerCollection | null;
  newestDiscoveryId: string | null;
  initialDiscoveryId?: string | null;
  onSelectDiscovery: (discoveryId: string | null) => void;
  onClose: () => void;
  onContinue: () => void;
  onAskParent: () => void;
}

export function CollectionDetailSheet({
  collection,
  newestDiscoveryId,
  initialDiscoveryId,
  onSelectDiscovery,
  onClose,
  onContinue,
  onAskParent,
}: Props) {
  const { width } = useWindowDimensions();

  if (!collection) return null;

  const recalledDiscovery =
    collection.discoveries.find((discovery) => discovery.id === initialDiscoveryId) ?? null;
  const theme = worldThemes[collection.category.id];
  const contentWidth = Math.min(width, 760) - spacing.xl * 2;
  const columns = width >= 700 ? 3 : 2;
  const tileWidth = (contentWidth - spacing.md * (columns - 1)) / columns;
  const locked = collection.status === 'locked';
  const closeOrBack = () => (recalledDiscovery ? onSelectDiscovery(null) : onClose());

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={closeOrBack}>
      <View style={{ flex: 1, backgroundColor: colors.cream }}>
        {recalledDiscovery ? (
          <ScrollView
            contentContainerStyle={{
              width: '100%',
              maxWidth: 620,
              minHeight: '100%',
              alignSelf: 'center',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.lg,
              padding: spacing.xl,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to My Discoveries"
              onPress={() => onSelectDiscovery(null)}
              style={{ alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' }}
            >
              <Text
                style={{
                  color: colors.ocean700,
                  fontFamily: fontFamily.bodyExtraBold,
                  fontSize: 16,
                }}
              >
                ← My Discoveries
              </Text>
            </Pressable>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={`${recalledDiscovery.title} artwork`}
            >
              <DiscoveryIllustration
                discovery={recalledDiscovery}
                size={Math.min(width * 0.52, 240)}
              />
            </View>
            <Text
              style={{
                color: colors.ink900,
                fontFamily: fontFamily.displayBold,
                fontSize: 32,
                textAlign: 'center',
                textTransform: 'uppercase',
              }}
            >
              {recalledDiscovery.title}
            </Text>
            <Text
              style={{
                color: colors.ink900,
                fontFamily: fontFamily.displaySemiBold,
                fontSize: 24,
                lineHeight: 32,
                textAlign: 'center',
              }}
            >
              {recalledDiscovery.funFact}
            </Text>
            <Text
              style={{
                color: colors.ink600,
                fontFamily: fontFamily.bodyRegular,
                fontSize: 17,
                lineHeight: 25,
                textAlign: 'center',
              }}
            >
              {recalledDiscovery.easyDescription}
            </Text>
            <Button
              label={`Explore ${collection.category.title} Again`}
              color={theme.primary}
              onPress={onContinue}
            />
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
            <View style={{ height: width >= 700 ? 300 : 230 }}>
              <WorldArtwork worldId={collection.category.id} width="100%" height="100%" />
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close My Discoveries"
                hitSlop={8}
                style={{
                  position: 'absolute',
                  right: spacing.lg,
                  top: spacing.xl,
                  width: 48,
                  height: 48,
                  borderRadius: radius.pill,
                  backgroundColor: `${colors.surface}EE`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: colors.ink900,
                    fontFamily: fontFamily.bodyExtraBold,
                    fontSize: 26,
                  }}
                >
                  ×
                </Text>
              </Pressable>
            </View>

            <View
              style={{
                width: '100%',
                maxWidth: 760,
                alignSelf: 'center',
                padding: spacing.xl,
                gap: spacing.xl,
              }}
            >
              <View style={{ gap: spacing.sm }}>
                <Text
                  style={{
                    color: colors.ink900,
                    fontFamily: fontFamily.displaySemiBold,
                    fontSize: 28,
                  }}
                >
                  {collection.deck.title}
                </Text>
                <Text
                  style={{
                    color: colors.ink600,
                    fontFamily: fontFamily.bodyRegular,
                    fontSize: 16,
                    lineHeight: 23,
                  }}
                >
                  {locked
                    ? 'A beautiful new world is waiting to be explored.'
                    : collection.deck.subtitle}
                </Text>
              </View>

              {locked ? (
                <View style={{ gap: spacing.md }}>
                  <Text
                    style={{
                      color: colors.ink600,
                      fontFamily: fontFamily.bodySemiBold,
                      fontSize: 16,
                    }}
                  >
                    A grown-up can preview this World and see what&apos;s included.
                  </Text>
                  <Button label="Grown-up Preview" color={theme.primary} onPress={onAskParent} />
                </View>
              ) : (
                <>
                  <ProgressBar
                    progress={collection.progress}
                    color={theme.primary}
                    label={`${collection.discoveredCount} of ${collection.totalCount} discoveries`}
                  />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
                    {collection.discoveries.map((discovery) => (
                      <DiscoveryObject
                        key={discovery.id}
                        discovery={discovery}
                        discovered={collection.discoveredIds.has(discovery.id)}
                        isNew={discovery.id === newestDiscoveryId}
                        width={tileWidth}
                        onPress={() => onSelectDiscovery(discovery.id)}
                      />
                    ))}
                  </View>
                  <Button
                    label={
                      collection.status === 'completed'
                        ? `Explore ${collection.category.title} Again`
                        : 'Continue This World'
                    }
                    color={theme.primary}
                    onPress={onContinue}
                  />
                </>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
