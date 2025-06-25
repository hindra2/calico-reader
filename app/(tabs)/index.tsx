import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Shelf from '@/components/Shelf';
import Header from '@/components/Header';
import FilePicker from '@/components/FilePicker';
import { parseDirectory } from '@/lib/directoryUtil';

export default function HomePage() {
    const router = useRouter();
    const [directory, setDirectory] = useState('');

    const handleSelectDir = async (path: string) => {
        setDirectory(path);
        await parseDirectory(path);
    };

    return (
        <View className="flex-1 items-center justify-center bg-white dark:bg-black">
            <Header />
            <SafeAreaView className="flex-1 w-[80%]">
                <Shelf />
                <FilePicker className="mb-4 text-dark dark:text-white" />
                {/* <DirectoryPicker onChange={handleSelectDir} />
                <Text className="text-dark dark:text-white">Selected Directory: {directory}</Text> */}
            </SafeAreaView>
        </View>
    );
}
