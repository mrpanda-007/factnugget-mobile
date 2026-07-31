import { Pressable, Text, View } from 'react-native';

interface SectionHeaderAction {
  label: string;
  onPress: () => void;
}

interface SectionHeaderProps {
  title: string;
  action?: SectionHeaderAction;
}

/** "Continue Exploring" / "My Collection" — docs/design/02-component-architecture.md#sectionheader */
export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-fredoka-semibold text-display-md text-ink-900">{title}</Text>
      {action ? (
        <Pressable
          onPress={action.onPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text className="font-nunito-extrabold text-body-sm text-ocean-500">{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
