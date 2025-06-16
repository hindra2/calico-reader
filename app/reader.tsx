import { useLocalSearchParams, router } from 'expo-router';
import EpubReader from '@/components/EpubReader';

import ReaderModal from '@/components/ReaderModal';
import { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function ReaderScreen() {
    const { fileUri } = useLocalSearchParams<{ fileUri: string }>();
    const [showModal, setShowModal] = useState(false);

    if (!fileUri) {
        router.back();
        return null;
    }

    const handleBack = () => {
        router.back();
    };

    const handleTap = () => {
        setShowModal(!showModal);
    };

    return (
        <GestureHandlerRootView>
            <EpubReader epubUri={fileUri} onTapMiddle={handleTap} />
            <ReaderModal visible={showModal} onBack={handleBack} onClose={handleTap} />
        </GestureHandlerRootView>
    );
}
