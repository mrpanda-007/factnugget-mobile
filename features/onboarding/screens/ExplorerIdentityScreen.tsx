import { useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@components/Avatar';
import { Button } from '@components/Button';
import { explorerIdentityOptions } from '@constants/explorerIdentities';
import { colors, elevation, fontFamily, radius, spacing } from '@constants/tokens';
import { useExplorerStore } from '@store/useExplorerStore';
import type { ExplorerIdentityId } from '@app-types/ExplorerIdentity';
import type { OnboardingScreenProps } from '@navigation/types';

export function ExplorerIdentityScreen({ navigation }: OnboardingScreenProps<'ExplorerIdentity'>) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const chooseIdentity = useExplorerStore((state) => state.chooseIdentity);
  const [selectedId, setSelectedId] = useState<ExplorerIdentityId | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const contentWidth = Math.min(width, 680);
  const horizontalPadding = width >= 700 ? spacing['2xl'] : spacing.lg;
  const cardWidth = (contentWidth - horizontalPadding * 2 - spacing.md) / 2;

  const confirmIdentity = async () => {
    if (!selectedId || isSaving) return;
    setIsSaving(true);
    try {
      await chooseIdentity(selectedId);
    } catch {
      setIsSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          width: '100%',
          maxWidth: 680,
          alignSelf: 'center',
          paddingTop: insets.top + spacing.sm,
          paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl,
          paddingHorizontal: horizontalPadding,
          gap: spacing.xl,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Welcome"
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={{ minWidth: 48, minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center' }}
        >
          <Text
            style={{ color: colors.ocean700, fontFamily: fontFamily.bodyExtraBold, fontSize: 16 }}
          >
            ← Back
          </Text>
        </Pressable>

        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Text
            style={{
              color: colors.ink900,
              fontFamily: fontFamily.displayBold,
              fontSize: width >= 700 ? 38 : 32,
              lineHeight: width >= 700 ? 46 : 39,
              textAlign: 'center',
            }}
          >
            Choose Your Explorer Look
          </Text>
          <Text
            style={{
              color: colors.ink600,
              fontFamily: fontFamily.bodyRegular,
              fontSize: 17,
              lineHeight: 24,
              textAlign: 'center',
            }}
          >
            You can visit every world.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {explorerIdentityOptions.map((option) => {
            const selected = selectedId === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityLabel={`${option.label}. ${option.description}`}
                accessibilityState={{ checked: selected }}
                onPress={() => setSelectedId(option.id)}
                style={({ pressed }) => [
                  elevation.resting,
                  {
                    width: cardWidth,
                    minHeight: 210,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.sm,
                    borderRadius: radius.lg,
                    borderWidth: selected ? 3 : 1,
                    borderColor: selected ? colors.ocean500 : colors.sand,
                    padding: spacing.md,
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.86 : 1,
                  },
                ]}
              >
                <Avatar identity={option.id} size={Math.min(96, cardWidth * 0.58)} />
                <Text
                  style={{
                    color: colors.ink900,
                    fontFamily: fontFamily.displaySemiBold,
                    fontSize: 19,
                    textAlign: 'center',
                  }}
                >
                  {option.label}
                </Text>
                <Text
                  style={{
                    color: colors.ink600,
                    fontFamily: fontFamily.bodyRegular,
                    fontSize: 14,
                    lineHeight: 19,
                    textAlign: 'center',
                  }}
                >
                  {option.description}
                </Text>
                {selected ? (
                  <Text
                    style={{
                      color: colors.ocean700,
                      fontFamily: fontFamily.bodyExtraBold,
                      fontSize: 14,
                    }}
                  >
                    ✓ Selected
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Button
          label={isSaving ? 'SAVING…' : 'BECOME AN EXPLORER'}
          size="large"
          disabled={!selectedId || isSaving}
          onPress={confirmIdentity}
        />
      </ScrollView>
    </View>
  );
}
