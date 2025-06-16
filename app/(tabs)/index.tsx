import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import FilePicker from '@/components/FilePicker';
import { useRouter } from 'expo-router';
import DirectoryPicker from '@/components/DirectoryPicker';

import { parseDirectory } from '@/lib/directoryUtil';

export default function HomePage() {
    const router = useRouter();
    const [directory, setDirectory] = useState('');

    const handleFileSelect = (path: string) => {
        router.push({
            pathname: '/reader',
            params: { fileUri: path },
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
