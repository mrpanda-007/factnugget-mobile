import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Badge } from '@components/Badge';
import { Button } from '@components/Button';
import { ParentalGate } from '@components/ParentalGate';
import { SpeakerIcon } from '@components/icons';
import { useExplorerStore } from '@store/useExplorerStore';
import type { ParentScreenProps } from '@navigation/types';

const trustPoints = [
  { icon: '🛡️', label: 'Safe Screen Time' },
  { icon: '🚫', label: 'No Advertisements' },
  { icon: '♾️', label: 'No Infinite Scroll' },
  { icon: '📚', label: 'Educational Discovery' },
  { icon: '🔒', label: 'Privacy Focused' },
];

/**
 * The calm parent trust hub — docs/design/01-screen-map.md "Parent Area".
 * Self-gates: the whole tab is behind ParentalGate
 * (docs/implementation/13-apple-kids-compliance.md#parental-gates), gated
 * per-session rather than every render, since re-solving a math problem on
 * every tab switch would be friction without a corresponding safety benefit.
 */
export function ParentAreaScreen({ navigation }: ParentScreenProps<'Area'>) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const soundEnabled = useExplorerStore((state) => state.soundEnabled);
  const toggleSound = useExplorerStore((state) => state.toggleSound);

  if (!isUnlocked) {
    return (
      <ParentalGate
        onSuccess={() => setIsUnlocked(true)}
        onCancel={() => navigation.navigate('Explore', { screen: 'DiscoverySelection' })}
      />
    );
  }

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="gap-2xl px-lg pb-3xl pt-4xl">
      <Text className="text-center font-fredoka-bold text-display-xl text-ink-900">
        Parent Area
      </Text>

      <View className="gap-md">
        <Text className="font-fredoka-semibold text-display-md text-ink-900">
          You can trust FactNuggets
        </Text>
        <View className="gap-sm">
          {trustPoints.map((point) => (
            <Badge key={point.label} icon={point.icon} label={point.label} />
          ))}
        </View>
      </View>

      <View className="gap-md">
        <Text className="font-fredoka-semibold text-display-md text-ink-900">Settings</Text>
        <View className="flex-row items-center justify-between rounded-lg bg-surface p-lg">
          <View className="flex-row items-center gap-sm">
            <SpeakerIcon muted={!soundEnabled} />
            <Text className="font-nunito-semibold text-body-md text-ink-900">Sound Effects</Text>
          </View>
          <Button
            label={soundEnabled ? 'On' : 'Off'}
            variant={soundEnabled ? 'primary' : 'secondary'}
            onPress={toggleSound}
          />
        </View>
      </View>

      <View className="gap-md">
        <Text className="font-fredoka-semibold text-display-md text-ink-900">More Discoveries</Text>
        <Button
          label="Unlock Space Explorer Pack"
          variant="secondary"
          onPress={() => navigation.navigate('PackPreview', { deckId: 'space-adventures' })}
        />
      </View>
    </ScrollView>
  );
}
