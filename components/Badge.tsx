import { Text, View } from 'react-native';

import { elevation } from '@constants/tokens';

interface BadgeProps {
  label: string;
  icon: string;
  /** 'gold' = highlighted trust/status context. */
  tone?: 'default' | 'gold';
}

export function Badge({ label, icon, tone = 'default' }: BadgeProps) {
  const isGold = tone === 'gold';

  return (
    <View
      style={elevation.resting}
      accessibilityRole="text"
      accessibilityLabel={label}
      className={`flex-row items-center gap-sm rounded-pill px-lg py-sm ${
        isGold ? 'bg-sunshine-50' : 'bg-surface'
      }`}
    >
      <Text className="text-body-lg">{icon}</Text>
      <Text className="font-nunito-extrabold text-label text-ink-900">{label}</Text>
    </View>
  );
}
