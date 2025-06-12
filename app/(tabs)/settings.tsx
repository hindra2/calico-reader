import { useState } from 'react';
import { useColorScheme } from 'nativewind';
import { StatusBar } from 'expo-status-bar';
import { Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Switch from '@/components/ui/Switch';

import ToggleTheme from '@/components/ToggleTheme';

export default function TabTwoScreen() {
    const [isEnabled, setIsEnabled] = useState(false);
    const toggleSwitch = (value: boolean) => {
        setIsEnabled(value);
    };

    const { colorScheme, setColorScheme } = useColorScheme();
    return (
        <SafeAreaView className="flex-1 pt-2 items-center justify-start bg-white dark:bg-black">
            <Text className="text-xl font-bold text-dark dark:text-white">Calico Reader</Text>
            <Text className="text-lg font-bold text-dark dark:text-white">v0.0.0</Text>
            {/* THEME SETTINGS */}
            <View className="flex w-full items-center justify-center my-10" style={{ gap: 2 }}>
                <Text className="w-5/6 text-lg text-start text-dark dark:text-neutral-200 mb-4">Theme Settings</Text>
                <ToggleTheme colorScheme={colorScheme} setColorScheme={setColorScheme} theme="light" />
                <ToggleTheme colorScheme={colorScheme} setColorScheme={setColorScheme} theme="dark" />
            </View>

            <View className="flex flex-row w-full items-center justify-center">
                <Text className="text-dark dark:text-white">Import test</Text>
                <Switch onValueChange={toggleSwitch} value={isEnabled} />
            </View>

            {/* Cover settings */}
            <View>
                {/* show progress bar on cover */}
                {/* show  */}
            </View>
            <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
        </SafeAreaView>
    );
}
