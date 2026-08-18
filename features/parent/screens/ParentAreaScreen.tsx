import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { ParentalGate } from '@components/ParentalGate';
import { SpeakerIcon } from '@components/icons';
import { DiscoveryIllustration } from '@features/collection/components/DiscoveryIllustration';
import { useParentProgress } from '@features/parent/hooks/useParentProgress';
import { WorldBadge } from '@features/rewards/components/WorldBadge';
import { RestorePurchasesSection } from '@features/parent/components/RestorePurchasesSection';
import { BackupAndSyncSection } from '@features/parent/components/BackupAndSyncSection';
import { colors } from '@constants/tokens';
import type { ParentScreenProps } from '@navigation/types';
import { useExplorerStore } from '@store/useExplorerStore';

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function ProgressStat({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 gap-xs rounded-md bg-cream p-md">
      <Text className="font-fredoka-semibold text-display-md text-ink-900">{value}</Text>
      <Text className="font-nunito-semibold text-body-sm text-ink-600">{label}</Text>
    </View>
  );
}

function HowItWorksStep({
  number,
  title,
  detail,
}: {
  number: string;
  title: string;
  detail: string;
}) {
  return (
    <View className="flex-row gap-md">
      <View className="h-8 w-8 items-center justify-center rounded-pill bg-ocean-100">
        <Text className="font-nunito-extrabold text-label text-ocean-700">{number}</Text>
      </View>
      <View className="flex-1 gap-xs pb-sm">
        <Text className="font-nunito-extrabold text-body-md text-ink-900">{title}</Text>
        <Text className="font-nunito-regular text-body-sm text-ink-600">{detail}</Text>
      </View>
    </View>
  );
}

function TrustPoint({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return (
    <View className="flex-row gap-md">
      <Text className="text-body-lg" accessible={false}>
        {icon}
      </Text>
      <View className="flex-1 gap-xs">
        <Text className="font-nunito-extrabold text-body-md text-ink-900">{title}</Text>
        <Text className="font-nunito-regular text-body-sm text-ink-600">{detail}</Text>
      </View>
    </View>
  );
}

/**
 * The parent trust hub. Product value, concrete learning evidence, and the
 * app&apos;s defensible safety boundaries come before the lower-priority settings.
 */
export function ParentAreaScreen({ navigation, route }: ParentScreenProps<'Area'>) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const soundEnabled = useExplorerStore((state) => state.soundEnabled);
  const toggleSound = useExplorerStore((state) => state.toggleSound);
  const { progress, isLoading, loadFailed, refresh } = useParentProgress();
  const requestedDeckId = route.params?.deckId;
  const requestedPackTitle = route.params?.requestedPackTitle;
  const requestedPackRequestId = route.params?.requestId;
  const handledPackRequestId = useRef<string | undefined>(undefined);

  const finishGate = () => {
    setIsUnlocked(true);
    if (requestedDeckId) {
      handledPackRequestId.current = requestedPackRequestId;
      navigation.navigate('PackPreview', { deckId: requestedDeckId });
    }
  };

  useEffect(() => {
    if (
      !isUnlocked ||
      !requestedDeckId ||
      !requestedPackRequestId ||
      handledPackRequestId.current === requestedPackRequestId
    ) {
      return;
    }
    handledPackRequestId.current = requestedPackRequestId;
    navigation.navigate('PackPreview', { deckId: requestedDeckId });
  }, [isUnlocked, navigation, requestedDeckId, requestedPackRequestId]);

  if (!isUnlocked) {
    return (
      <ParentalGate
        destinationTitle={requestedPackTitle}
        onSuccess={finishGate}
        onCancel={() => navigation.navigate('Explore', { screen: 'DiscoverySelection' })}
      />
    );
  }

  const hasProgress = progress.discoveriesFound > 0;
  const firstLockedPack = progress.lockedPacks[0];

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerClassName="gap-2xl px-lg pb-3xl pt-4xl"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-md">
        <Text accessibilityRole="header" className="font-fredoka-bold text-display-xl text-ink-900">
          Screen time built for curiosity
        </Text>
        <Text className="font-nunito-regular text-body-md text-ink-600">
          FactNuggets gives children ages 5–8 a safe, finite way to discover amazing things about
          the real world—without ads or an endless feed.
        </Text>
      </View>

      <View className="gap-md">
        <Text
          accessibilityRole="header"
          className="font-fredoka-semibold text-display-md text-ink-900"
        >
          This explorer&apos;s discoveries
        </Text>

        {isLoading ? (
          <View className="items-center rounded-lg bg-surface p-xl">
            <ActivityIndicator color={colors.ocean500} />
          </View>
        ) : loadFailed ? (
          <Card className="gap-md" padding="lg">
            <Text className="font-nunito-regular text-body-md text-ink-600">
              Progress is taking a moment to load.
            </Text>
            <Button label="Try Again" onPress={refresh} variant="secondary" />
          </Card>
        ) : !hasProgress ? (
          <Card className="gap-md" padding="lg">
            <Text className="font-fredoka-semibold text-body-md text-ink-900">
              This explorer is ready to begin
            </Text>
            <Text className="font-nunito-regular text-body-md text-ink-600">
              Once your child starts discovering, their completed Discoveries and Worlds will appear
              here.
            </Text>
            <Button
              label="Explore Currently Available Worlds"
              onPress={() => navigation.navigate('Explore', { screen: 'DiscoverySelection' })}
              variant="secondary"
            />
          </Card>
        ) : (
          <View className="gap-lg">
            <Card className="gap-lg" padding="lg">
              <View className="flex-row gap-sm">
                <ProgressStat
                  value={progress.discoveriesFound}
                  label={countLabel(
                    progress.discoveriesFound,
                    'discovery found',
                    'discoveries found',
                  )}
                />
                <ProgressStat
                  value={progress.completedWorlds}
                  label={countLabel(progress.completedWorlds, 'World complete', 'Worlds complete')}
                />
                <ProgressStat
                  value={progress.badgesEarned}
                  label={countLabel(progress.badgesEarned, 'Badge earned', 'Badges earned')}
                />
              </View>

              {progress.recentDiscoveries.length > 0 ? (
                <View className="gap-md">
                  <Text className="font-nunito-extrabold text-label text-ink-600">
                    RECENTLY DISCOVERED
                  </Text>
                  {progress.recentDiscoveries.map((discovery) => (
                    <View
                      key={discovery.id}
                      accessible
                      accessibilityLabel={`${discovery.title}. ${discovery.funFact}`}
                      className="flex-row items-center gap-md"
                    >
                      <DiscoveryIllustration discovery={discovery} size={48} />
                      <View className="flex-1 gap-xs">
                        <Text className="font-nunito-extrabold text-body-md text-ink-900">
                          {discovery.title}
                        </Text>
                        <Text
                          className="font-nunito-regular text-body-sm text-ink-600"
                          numberOfLines={2}
                        >
                          {discovery.funFact}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>

            {progress.badges.map((badge) => (
              <WorldBadge
                key={badge.deckId}
                worldId={badge.worldId}
                worldTitle={badge.worldTitle}
                title={badge.title}
                icon={badge.icon}
                statusLabel="Badge earned"
              />
            ))}
          </View>
        )}
      </View>

      <View className="gap-md">
        <Text
          accessibilityRole="header"
          className="font-fredoka-semibold text-display-md text-ink-900"
        >
          How FactNuggets works
        </Text>
        <Card className="gap-md" padding="lg">
          <HowItWorksStep number="1" title="Choose a World" detail="Ocean, Space, and more." />
          <HowItWorksStep
            number="2"
            title="Find Discoveries"
            detail="Each Discovery introduces one memorable real-world idea."
          />
          <HowItWorksStep
            number="3"
            title="Keep what they learn"
            detail="Every completed Discovery appears in My Discoveries."
          />
          <HowItWorksStep
            number="4"
            title="Complete a World"
            detail="Finish its Discoveries to earn that World's Badge."
          />
        </Card>
      </View>

      <View className="gap-md">
        <Text
          accessibilityRole="header"
          className="font-fredoka-semibold text-display-md text-ink-900"
        >
          Why parents can trust it
        </Text>
        <Card className="gap-lg" padding="lg">
          <TrustPoint
            icon="🚫"
            title="No ads"
            detail="FactNuggets does not show advertising to children."
          />
          <TrustPoint
            icon="⏹️"
            title="Clear stopping points"
            detail="Each World is a finite set of Discoveries with a natural ending."
          />
          <TrustPoint
            icon="💬"
            title="No child messaging"
            detail="There are no child-to-child communication features."
          />
          <TrustPoint
            icon="🌱"
            title="Made for ages 5–8"
            detail="Discoveries are written for FactNuggets' child age range."
          />
          <TrustPoint
            icon="👤"
            title="Guest-friendly core experience"
            detail="A child does not need an account to start exploring."
          />
        </Card>
      </View>

      {firstLockedPack ? (
        <View className="gap-md">
          <Text
            accessibilityRole="header"
            className="font-fredoka-semibold text-display-md text-ink-900"
          >
            More Discoveries
          </Text>
          <Card className="gap-md" padding="lg">
            <Text className="font-fredoka-semibold text-body-lg text-ink-900">
              {firstLockedPack.title}
            </Text>
            <Text className="font-nunito-regular text-body-md text-ink-600">
              {firstLockedPack.discoveryCount} discoveries for ages 5–8.
            </Text>
            <Button
              label={`Preview ${firstLockedPack.title}`}
              onPress={() => navigation.navigate('PackPreview', { deckId: firstLockedPack.deckId })}
              variant="secondary"
            />
          </Card>
        </View>
      ) : null}

      <RestorePurchasesSection onRestored={refresh} />

      <BackupAndSyncSection />

      <View className="gap-md">
        <Text
          accessibilityRole="header"
          className="font-fredoka-semibold text-display-md text-ink-900"
        >
          Settings
        </Text>
        <Card className="flex-row items-center justify-between" padding="lg">
          <View className="flex-1 flex-row items-center gap-sm pr-md">
            <SpeakerIcon muted={!soundEnabled} />
            <View className="flex-1">
              <Text className="font-nunito-semibold text-body-md text-ink-900">Sound effects</Text>
              <Text className="font-nunito-regular text-body-sm text-ink-600">
                Play gentle sounds during discovery and celebration.
              </Text>
            </View>
          </View>
          <Button
            label={soundEnabled ? 'On' : 'Off'}
            variant={soundEnabled ? 'primary' : 'secondary'}
            onPress={toggleSound}
            accessibilityLabel={`Sound effects ${soundEnabled ? 'on' : 'off'}. Activate to turn ${soundEnabled ? 'off' : 'on'}.`}
          />
        </Card>
      </View>
    </ScrollView>
  );
}
