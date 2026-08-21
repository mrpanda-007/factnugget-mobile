import { useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@components/Avatar';
import { Button } from '@components/Button';
import { WorldBackground } from '@components/WorldBackground';
import { explorerIdentityOptions, identityWorldId } from '@constants/explorerIdentities';
import { colors, elevation, fontFamily, radius, spacing, worldThemes } from '@constants/tokens';
import { useExplorerStore } from '@store/useExplorerStore';
import type { ExplorerIdentityId } from '@app-types/ExplorerIdentity';

interface ExplorerLookPickerProps {
  title: string;
  ctaLabel: string;
  initialSelectedId?: ExplorerIdentityId | null;
  onBack: () => void;
  /**
   * Called once the look is persisted. Onboarding omits it — RootNavigator
   * swaps stacks by itself the moment `identity` stops being null. The
   * "change look" entry point passes goBack(), since `identity` is already
   * set there and nothing would move on its own.
   */
  onSaved?: () => void;
}

/**
 * The look grid shared by onboarding's ExplorerIdentityScreen and Explore's
 * ChangeLookScreen. Both flows show the same 4 cosmetic options
 * (constants/explorerIdentities.ts) and both persist through
 * useExplorerStore.chooseIdentity, which handles create *and* update —
 * see repositories/ExplorerRepository.ts#createOrUpdateActiveExplorer.
 *
 * Not a screen: it owns no navigation, so each caller keeps its own
 * correctly-typed navigation prop (navigation/types.ts "typed navigation only").
 */
export function ExplorerLookPicker({
  title,
  ctaLabel,
  initialSelectedId = null,
  onBack,
  onSaved,
}: ExplorerLookPickerProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const chooseIdentity = useExplorerStore((state) => state.chooseIdentity);
  const [selectedId, setSelectedId] = useState<ExplorerIdentityId | null>(initialSelectedId);
  const [isSaving, setIsSaving] = useState(false);

  const horizontalPadding = width >= 700 ? spacing['2xl'] : spacing.lg;
  const avatarSize = 80;
  // Live preview: reacts to the in-progress selection, not the persisted
  // identity, so it tints as a kid taps between cards before saving.
  const previewTheme = selectedId ? worldThemes[identityWorldId[selectedId]] : null;

  const confirmIdentity = async () => {
    if (!selectedId || isSaving) return;
    setIsSaving(true);
    try {
      await chooseIdentity(selectedId);
      onSaved?.();
    } catch {
      setIsSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      {previewTheme ? <WorldBackground world={previewTheme} intensity="subtle" /> : null}
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
          accessibilityLabel="Go back"
          onPress={onBack}
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
            {title}
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

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.md,
            justifyContent: 'center',
          }}
        >
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
                    width: '48%',
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
                <Avatar identity={option.id} size={avatarSize} />
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
          label={isSaving ? 'SAVING…' : ctaLabel}
          size="large"
          disabled={!selectedId || isSaving}
          onPress={confirmIdentity}
        />
      </ScrollView>
    </View>
  );
}
