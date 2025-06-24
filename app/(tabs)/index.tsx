import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import FilePicker from '@/components/FilePicker';
import { parseDirectory } from '@/lib/directoryUtil';
import DirectoryPicker from '@/components/DirectoryPicker';

export default function HomePage() {
    const router = useRouter();
    const [directory, setDirectory] = useState('');

    const handleFileSelect = (path: string) => {
        router.push({
            params: { fileUri: path },
            pathname: '/reader',
        });
    };

    const handleSelectDir = async (path: string) => {
        setDirectory(path);
        await parseDirectory(path);
    };

    return (
        <View className="flex-1 items-center justify-center bg-white dark:bg-black">
            <Text className="text-xl font-bold text-dark dark:text-white mb-4">Calico Reader</Text>
            <FilePicker className="mb-4 text-dark dark:text-white" onChange={handleFileSelect} />
            <DirectoryPicker onChange={handleSelectDir} />
            <Text className="text-dark dark:text-white">Selected Directory: {directory}</Text>
        </View>
    );
}
