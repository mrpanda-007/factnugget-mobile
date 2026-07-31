import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors, elevation } from '@constants/tokens';
import { usePressScale } from '@hooks/usePressScale';

export type ButtonVariant = 'primary' | 'secondary' | 'icon';
export type ButtonSize = 'default' | 'large';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  disabled?: boolean;
  /** Active world/theme primary color. Defaults to the app's default Ocean Blue. */
  color?: string;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** docs/design/02-component-architecture.md#button */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  icon,
  disabled = false,
  color = colors.ocean500,
  accessibilityLabel,
}: ButtonProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();
  const heightClassName = size === 'large' ? 'h-16' : 'h-14';

  if (variant === 'icon') {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        style={[animatedStyle, elevation.resting]}
        className={`h-11 w-11 items-center justify-center rounded-pill bg-surface ${disabled ? 'opacity-50' : ''}`}
      >
        {icon}
      </AnimatedPressable>
    );
  }

  const isPrimary = variant === 'primary';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={[
        animatedStyle,
        elevation.resting,
        isPrimary ? { backgroundColor: disabled ? colors.ink400 : color } : { borderColor: color },
      ]}
      className={`${heightClassName} flex-row items-center justify-center gap-sm rounded-md px-xl ${
        isPrimary ? '' : 'border-2 bg-surface'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      {icon}
      <Text
        className={`font-nunito-extrabold text-label ${isPrimary ? 'text-white' : ''}`}
        style={!isPrimary ? { color } : undefined}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
