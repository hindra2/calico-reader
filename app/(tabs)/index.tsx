import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import DirectoryPicker from '@/components/DirectoryPicker';
import FilePicker from '@/components/FilePicker';
import { parseDirectory } from '@/lib/directoryUtil';
import CalicoParser from '@/modules/CalicoParser';

export default function HomePage() {
    const router = useRouter();
    const [directory, setDirectory] = useState('');
    const [test, setTest] = useState('');

    const nativeTest = () => {
        const res = CalicoParser.hello();
        setTest(res);
    };

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
            <Pressable onPress={nativeTest}>
                <Text className="text-dark dark:text-white">TEST NATIVE</Text>
            </Pressable>
            <Text className="text-dark dark:text-white">{test}</Text>
        </View>
    );
}
