import { Platform } from 'react-native';

import { getPlatformProductId } from './catalogue';
import type { CommerceKey, PlatformProductId } from '@app-types/domain/ids';

/** Runtime-only bridge. Catalogue lookups remain platform-argument testable. */
export function getCurrentPlatformProductId(commerceKey: CommerceKey): PlatformProductId {
  return getPlatformProductId(commerceKey, Platform.OS);
}
