import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { colors } from '@constants/tokens';
import { CollectionScreen } from '@features/collection/screens/CollectionScreen';
import { ExploreNavigator } from '@navigation/ExploreNavigator';
import { ParentNavigator } from '@navigation/ParentNavigator';
import type { MainTabParamList } from '@navigation/types';

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

/**
 * The 3-tab shell — docs/design/01-screen-map.md "Navigation Philosophy":
 * large friendly buttons, world-based navigation, no hamburger menu.
 */
export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ocean500,
        tabBarInactiveTintColor: colors.ink400,
        tabBarStyle: { backgroundColor: colors.surface },
        tabBarLabelStyle: { fontFamily: 'Nunito_600SemiBold', fontSize: 12 },
      }}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreNavigator}
        options={{ tabBarLabel: 'Explore', tabBarIcon: () => <TabIcon emoji="🌎" /> }}
      />
      <Tab.Screen
        name="Collection"
        component={CollectionScreen}
        options={{ tabBarLabel: 'Collection', tabBarIcon: () => <TabIcon emoji="⭐" /> }}
      />
      <Tab.Screen
        name="Parent"
        component={ParentNavigator}
        options={{ tabBarLabel: 'Parent Area', tabBarIcon: () => <TabIcon emoji="🔒" /> }}
      />
    </Tab.Navigator>
  );
}
