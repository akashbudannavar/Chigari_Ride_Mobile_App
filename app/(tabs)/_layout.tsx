import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Home, Route as RouteIcon, Map, Ticket as TicketIcon, User } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Text } from '@/components/ui/Text';

const tabs = [
  { name: 'index', title: 'Home', icon: Home },
  { name: 'routes', title: 'Routes', icon: RouteIcon },
  { name: 'live', title: 'Live', icon: Map },
  { name: 'tickets', title: 'Tickets', icon: TicketIcon },
  { name: 'profile', title: 'Profile', icon: User },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarIcon: ({ color, size, focused }) => (
                <View style={focused ? styles.iconActive : styles.iconInactive}>
                  <Icon
                    size={size}
                    color={focused ? Colors.textOnPrimary : color}
                    strokeWidth={focused ? 2.5 : 2}
                    absoluteStrokeWidth={false}
                  />
                </View>
              ),
              tabBarButton: (props) => {
                const { onPress, ...rest } = props as any;
                return (
                  <Pressable
                    {...rest}
                    onPress={(e) => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      onPress?.(e);
                    }}
                  />
                );
              },
            }}
          />
        );
      })}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 0,
    height: 64,
    paddingBottom: 8,
    paddingTop: 4,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tabItem: {
    paddingVertical: 0,
  },
  tabLabel: {
    ...Typography.labelSmall,
    fontFamily: 'Poppins-Medium',
    marginTop: 2,
  },
  iconActive: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconInactive: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
