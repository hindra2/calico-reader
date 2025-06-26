import { useState } from 'react';
import { View } from 'react-native';
// import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Shelf from '@/components/Shelf';
import { deleteMMKV } from '@/lib/mmkv';
import Header from '@/components/Header';
import FilePicker from '@/components/FilePicker';
// import { parseDirectory } from '@/lib/directoryUtil';
import { bookEventEmitter } from '@/lib/EventEmitter';

export default function HomePage() {
    // const router = useRouter();
    // const [directory, setDirectory] = useState('');
    const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

    // const handleSelectDir = async (path: string) => {
    //     setDirectory(path);
    //     await parseDirectory(path);
    // };

    const toggleSelect = (id: string) => {
        setSelectedCards(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleBatchDelete = () => {
        selectedCards.forEach(key => {
            deleteMMKV(key);
        });
        setSelectedCards(new Set());
        bookEventEmitter.emit('booksUpdated');
    };

    return (
        <View className="flex-1 items-center justify-center bg-white dark:bg-black">
            <Header onBatchDelete={handleBatchDelete} hasSelection={selectedCards.size > 0} />
            <SafeAreaView className="flex-1 w-[80%]">
                <Shelf selectedCards={selectedCards} toggleSelect={toggleSelect} />
                <FilePicker className="mb-4 text-dark dark:text-white" />
                {/* <DirectoryPicker onChange={handleSelectDir} />
                <Text className="text-dark dark:text-white">Selected Directory: {directory}</Text> */}
            </SafeAreaView>
        </View>
    );
}
