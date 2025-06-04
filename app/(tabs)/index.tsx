import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';

import { ExternalLink } from '@/components/ExternalLink';
import FilePicker from '@/components/FilePicker';
import EpubReader from '@/components/EpubReader';
import { useRouter } from 'expo-router';

export default function HomePage() {
    const router = useRouter();

    const handleFileSelect = (path: string) => {
        router.push({
            pathname: '/reader',
            params: { fileUri: path },
        });
    };

    return (
        <View className="flex-1 items-center justify-center bg-white dark:bg-black">
            <Text className="text-xl font-bold text-dark dark:text-white mb-4">EPUB Reader</Text>
            <FilePicker className="mb-4 text-dark dark:text-white" onChange={handleFileSelect} />
        </View>
    );
}
