import React, { useEffect, useState } from 'react';
import { Dimensions, View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseEpubMetadataWithValidation, isValidEpubFile, parseEpubMetadata } from '@/lib/epubUtil';
import { Metadata } from '@/lib/epubTypes';

interface EpubReaderProps {
    epubUri: string;
    onBack?: () => void;
    onTapMiddle?: () => void;
}

const screenHeight = Dimensions.get('screen').height;

const Reader: React.FC<EpubReaderProps> = ({ epubUri, onTapMiddle }) => {
    const [data, setData] = useState<Metadata | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadEpub = async () => {
        const metadata = await parseEpubMetadataWithValidation(epubUri);

        console.log(metadata);

        setData(metadata);
    };

    useEffect(() => {
        loadEpub();
    });

    const tap = Gesture.Tap()
        .onEnd(() => {
            onTapMiddle?.();
        })
        .runOnJS(true);

    if (loading) {
        return (
            <SafeAreaView>
                <Text>Loading</Text>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView>
                <Text>{error}</Text>
            </SafeAreaView>
        );
    }

    return (
        <GestureDetector gesture={tap}>
            <SafeAreaView className="flex-1">
                <Text>HELLO</Text>
                <Text>{data?.title}</Text>
            </SafeAreaView>
        </GestureDetector>
    );
};

export default Reader;
