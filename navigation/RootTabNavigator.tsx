import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { HomePlaceholderScreen } from '@app/HomePlaceholderScreen';
import type { RootTabParamList } from '@navigation/types';

const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * Bottom tab navigator scaffold. "Home" is a temporary placeholder screen
 * (app/HomePlaceholderScreen.tsx), not a feature — real tabs are added when
 * feature screens exist.
 */
export function RootTabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomePlaceholderScreen} />
    </Tab.Navigator>
  );
}
