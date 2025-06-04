// app/reader.tsx
import { useLocalSearchParams, router } from 'expo-router';
import EpubReader from '@/components/EpubReader';

export default function ReaderScreen() {
    const { fileUri } = useLocalSearchParams<{ fileUri: string }>();

    const handleBack = () => {
        router.back();
    };

    if (!fileUri) {
        router.back();
        return null;
    }

    return <EpubReader epubUri={fileUri} onBack={handleBack} />;
}
