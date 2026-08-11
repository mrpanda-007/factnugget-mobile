import { useState } from 'react';
import { Image, ScrollView, View, useWindowDimensions } from 'react-native';

import { IllustrationStage } from '@components/IllustrationStage';
import type { WorldTheme } from '@constants/tokens';

interface ImageCarouselProps {
  /** 0–3 real photo URLs. Fewer than 3 (or none) is fine — see types/Discovery.ts#images. */
  images: string[];
  /** Placeholder fallback — shown whenever there are no images, and per-slide if a photo fails to load. */
  emoji: string;
  theme: WorldTheme;
  height: number;
}

/**
 * The Discovery Card's horizontal swipeable photo gallery — the top ~60% of
 * the card per the Shorts-style layout. Reuses `IllustrationStage` as the
 * fallback slide (both for a fully-emoji discovery and for any individual
 * photo that fails to load at runtime) rather than inventing a second
 * placeholder treatment.
 */
export function ImageCarousel({ images, emoji, theme, height }: ImageCarouselProps) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [failedSlides, setFailedSlides] = useState<Set<number>>(new Set());

  const slideCount = images.length || 1;

  const fallback = (
    <View
      style={{ width, height, backgroundColor: theme.tint }}
      className="items-center justify-center"
    >
      <IllustrationStage emoji={emoji} theme={theme} size={Math.min(height, width) * 0.65} />
    </View>
  );

  return (
    <View style={{ height, width }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setPage(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
      >
        {images.length === 0
          ? fallback
          : images.map((uri, index) =>
              failedSlides.has(index) ? (
                <View key={uri}>{fallback}</View>
              ) : (
                <Image
                  key={uri}
                  source={{ uri }}
                  style={{ width, height }}
                  resizeMode="cover"
                  accessibilityRole="image"
                  accessibilityLabel={`${emoji} photo ${index + 1} of ${images.length}`}
                  onError={() => setFailedSlides((current) => new Set(current).add(index))}
                />
              ),
            )}
      </ScrollView>

      {slideCount > 1 ? (
        <View
          accessible={false}
          importantForAccessibility="no"
          pointerEvents="none"
          className="absolute inset-x-0 bottom-md flex-row justify-center gap-xs"
        >
          {Array.from({ length: slideCount }, (_, index) => (
            <View
              key={index}
              className="h-2 w-2 rounded-pill bg-white"
              style={{ opacity: index === page ? 1 : 0.4 }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
