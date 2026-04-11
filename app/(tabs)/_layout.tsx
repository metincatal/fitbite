import { Tabs } from 'expo-router';
import { Colors } from '../../lib/constants';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  iconName,
  iconNameFocused,
  label,
  focused,
}: {
  iconName: IoniconName;
  iconNameFocused: IoniconName;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={styles.tabItem}>
      <Ionicons
        name={focused ? iconNameFocused : iconName}
        size={24}
        color={focused ? Colors.primary : Colors.textMuted}
      />
      <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text>
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
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName="home-outline"
              iconNameFocused="home"
              label="Ana Sayfa"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="food-log"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName="restaurant-outline"
              iconNameFocused="restaurant"
              label="Günlük"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName="chatbubble-ellipses-outline"
              iconNameFocused="chatbubble-ellipses"
              label="FitBot"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName="trending-up-outline"
              iconNameFocused="trending-up"
              label="İlerleme"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName="person-outline"
              iconNameFocused="person"
              label="Profil"
              focused={focused}
            />
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
    gap: 3,
  },
  label: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  labelFocused: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
