import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import Text from '@/components/ui/Text';

import FilePicker from '@/components/FilePicker';
import { parseDirectory } from '@/lib/directoryUtil';
import DirectoryPicker from '@/components/DirectoryPicker';
import Shelf from '@/components/Shelf';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storage } from '@/lib/mmkv';

export default function HomePage() {
    const router = useRouter();
    const [directory, setDirectory] = useState('');

    const handleSelectDir = async (path: string) => {
        setDirectory(path);
        await parseDirectory(path);
    };

    return (
        <View className="flex-1 items-center justify-center bg-white dark:bg-black">
            <SafeAreaView className="flex-1 w-[80%]">
                <Shelf />
                <FilePicker className="mb-4 text-dark dark:text-white" />
                {/* <DirectoryPicker onChange={handleSelectDir} />
                <Text className="text-dark dark:text-white">Selected Directory: {directory}</Text> */}
            </SafeAreaView>
        </View>
    );
}
