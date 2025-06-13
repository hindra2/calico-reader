import { Link, Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
    name: React.ComponentProps<typeof FontAwesome>['name'];
    color: string;
    focused: boolean;
}) {
    return (
        <View
            className={`w-20 h-12 items-center justify-center rounded-full overflow-hidden`}
            style={{
                backgroundColor: props.focused ? `${props.color}50` : 'transparent',
            }}
        >
            <FontAwesome size={28} {...props} />
        </View>
    );
}

export default function TabLayout() {
    const { colorScheme } = useColorScheme();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: 'transparent',
                    borderTopWidth: 0,
                    height: 70,
                    justifyContent: 'center',
                    paddingTop: 19,
                },
                tabBarBackground: () => (
                    <View
                        className="flex-1"
                        style={{ backgroundColor: Colors[colorScheme ?? 'light'].tabBarBackground }}
                    />
                ),
                tabBarButton: props => {
                    return (
                        <Pressable
                            onPress={props.onPress}
                            onLongPress={props.onLongPress}
                            android_ripple={{ color: 'transparent' }}
                            className="items-center justify-center"
                        >
                            {props.children}
                        </Pressable>
                    );
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ color, focused }) => <TabBarIcon name="home" color={color} focused={focused} />,
                    title: 'Home',
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    tabBarIcon: ({ color, focused }) => <TabBarIcon name="cog" color={color} focused={focused} />,
                    title: 'Settings',
                }}
            />
        </Tabs>
    );
}
