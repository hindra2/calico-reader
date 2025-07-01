import { useLocalSearchParams, useRouter } from 'expo-router';
import EpubReader from '@/components/EpubReader';

import ReaderModal from '@/components/ReaderModal';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { cleanCache } from '@/lib/epub';

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
        cleanCache();
        router.back();
    };

    const handleTap = () => {
        setShowModal(!showModal);
    };

    return (
        <GestureHandlerRootView>
            <EpubReader bookKey={bookKey} onTapMiddle={handleTap} />
            <ReaderModal visible={showModal} onBack={handleBack} onClose={handleTap} />
        </GestureHandlerRootView>
    );
}
