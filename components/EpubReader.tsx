import { SafeAreaView } from 'react-native-safe-area-context';
import { Dimensions, Text, ScrollView, View, ActivityIndicator } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { XMLParser } from 'fast-xml-parser';

import CalicoParser from '@/modules/CalicoParser';
// import { parseEpub } from '@/modules/CalicoParser/src/CalicoParser.types';

interface EpubReaderProps {
    epubUri: string;
    onBack?: () => void;
    onTapMiddle?: () => void;
}

const screenHeight = Dimensions.get('screen').height;
const screenWidth = Dimensions.get('screen').width;

const Reader: React.FC<EpubReaderProps> = ({ epubUri, onTapMiddle }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [epubMetadata, setEpubMetadata] = useState<string>('');

    const loadEpub = useCallback(async () => {
        try {
            setLoading(true);
            const result = await CalicoParser.parseEpub(epubUri);
            console.log('Parsed metadata:', result);
            setEpubMetadata(result);
        } catch (error) {
            console.error('Failed to load EPUB:', error);
            setError(error instanceof Error ? error.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [epubUri]);

    useEffect(() => {
        loadEpub();
    }, [loadEpub]);

    // gestures
    const tap = Gesture.Tap()
        .onEnd(event => {
            const { x } = event;

            const leftThird = screenWidth / 3;
            const rightThird = (screenWidth * 2) / 3;

            if (x < leftThird) {
                console.log('prev chapter');
            } else if (x > rightThird) {
                console.log('next chapter');
            } else {
                onTapMiddle?.();
            }
        })
        .runOnJS(true);

    const swipe = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-20, 20])
        .onEnd(event => {
            if (event.velocityX > 500) {
                console.log('prev chapter swipe');
            } else if (event.velocityX < -500) {
                console.log('next chapter swipe');
            }
        })
        .runOnJS(true);

    const gestures = Gesture.Race(tap, swipe);

    if (loading) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center">
                <ActivityIndicator size={'large'} />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center px-4">
                <Text className="text-red-500 text-center">{error}</Text>
            </SafeAreaView>
        );
    }

    return (
        <GestureDetector gesture={gestures}>
            <SafeAreaView className="flex-1">
                <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
                    <Text>{epubMetadata}</Text>
                </ScrollView>
            </SafeAreaView>
        </GestureDetector>
    );
};

export default Reader;
