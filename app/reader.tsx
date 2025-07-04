import { View, Pressable } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { cleanCache } from '@/lib/epub';
import EpubReader from '@/components/EpubReader';
import ReaderModal from '@/components/ReaderModal';

export default function ReaderScreen() {
    const router = useRouter();
    const { bookKey } = useLocalSearchParams<{ bookKey: string }>();
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (!bookKey) {
            router.back();
        }
    }, [bookKey]);

    const handleBack = () => {
        setShowModal(false);
        cleanCache();
        router.back();
    };

    const handleTap = () => {
        setShowModal(!showModal);
    };

    return (
        <View className="flex-1 h-full w-full">
            <EpubReader bookKey={bookKey} onTapMiddle={handleTap} />
            <ReaderModal visible={showModal} onBack={handleBack} onClose={handleTap} />
        </View>
    );
}
