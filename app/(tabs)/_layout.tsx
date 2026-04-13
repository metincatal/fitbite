import { Tabs } from 'expo-router';
import { Colors } from '../../lib/constants';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  iconName,
  iconNameFocused,
  focused,
}: {
  iconName: IoniconName;
  iconNameFocused: IoniconName;
  focused: boolean;
}) {
  return (
    <View style={styles.tabItem}>
      <Ionicons
        name={focused ? iconNameFocused : iconName}
        size={26}
        color={focused ? Colors.primary : Colors.textMuted}
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.borderLight,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="home-outline" iconNameFocused="home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="food-log"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="restaurant-outline" iconNameFocused="restaurant" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="chatbubble-ellipses-outline" iconNameFocused="chatbubble-ellipses" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="trending-up-outline" iconNameFocused="trending-up" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="person-outline" iconNameFocused="person" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
});
