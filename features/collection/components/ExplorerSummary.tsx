import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, fontFamily, spacing } from '@constants/tokens';

interface Props {
  explorerName: string;
  discoveredCount: number;
  availableCount: number;
}

function TrailMarker({ filled, final }: { filled: boolean; final: boolean }) {
  return (
    <Svg width={final ? 34 : 28} height={34} viewBox="0 0 34 34" accessibilityElementsHidden>
      <Circle
        cx={17}
        cy={17}
        r={final ? 15 : 12}
        fill={filled ? colors.sunshine500 : colors.sand}
      />
      {final ? (
        <Path
          d="M17 7 L20 13 L27 14 L22 19 L23 26 L17 23 L11 26 L12 19 L7 14 L14 13 Z"
          fill={filled ? colors.surface : colors.ink400}
        />
      ) : (
        <Circle cx={17} cy={17} r={filled ? 4 : 3} fill={filled ? colors.surface : colors.ink400} />
      )}
    </Svg>
  );
}

export function ExplorerSummary({ explorerName, discoveredCount, availableCount }: Props) {
  const markerCount = 7;
  const filledCount = availableCount
    ? Math.max(
        discoveredCount > 0 ? 1 : 0,
        Math.round((discoveredCount / availableCount) * markerCount),
      )
    : 0;

  return (
    <View
      accessible
      accessibilityLabel={`${explorerName}. ${discoveredCount} discoveries found.`}
      style={{
        borderRadius: 28,
        backgroundColor: colors.surface,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      <View>
        <Text
          style={{ color: colors.ink900, fontFamily: fontFamily.displaySemiBold, fontSize: 20 }}
        >
          {explorerName}
        </Text>
        <Text style={{ color: colors.ink600, fontFamily: fontFamily.bodySemiBold, fontSize: 14 }}>
          {discoveredCount} {discoveredCount === 1 ? 'discovery' : 'discoveries'} found
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {Array.from({ length: markerCount }, (_, index) => (
          <View
            key={index}
            style={{
              flex: index === markerCount - 1 ? 0 : 1,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <TrailMarker filled={index < filledCount} final={index === markerCount - 1} />
            {index < markerCount - 1 ? (
              <View
                style={{
                  flex: 1,
                  height: 3,
                  backgroundColor: index < filledCount - 1 ? colors.sunshine300 : colors.sand,
                }}
              />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
