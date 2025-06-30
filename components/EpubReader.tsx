import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Dimensions, Text, ScrollView, View, ActivityIndicator } from 'react-native';

import { storage } from '@/lib/mmkv';
import { loadEpub } from '@/lib/epub';
import { Metadata } from '@/modules/CalicoParser';

interface EpubReaderProps {
    bookKey: string;
    onBack?: () => void;
    onTapMiddle?: () => void;
}

const screenHeight = Dimensions.get('screen').height;
const screenWidth = Dimensions.get('screen').width;

const Reader: React.FC<EpubReaderProps> = ({ bookKey, onTapMiddle }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [epubMetadata, setEpubMetadata] = useState<Metadata | null>(null);

    const loadDocument = useCallback(async () => {
        try {
            setLoading(true);
            const raw = await storage.getString('books:' + bookKey);
            if (!raw) {
                console.error('book doesnt exist');
                return;
            }
            const metadata = JSON.parse(raw);
            const result = await loadEpub(metadata.path);
            setEpubMetadata(result);
        } catch (error) {
            console.error('Failed to load EPUB:', error);
        } finally {
            setLoading(false);
        }
    }, [bookKey]);

    useEffect(() => {
        loadDocument();
    }, [loadDocument]);

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

    // title
    const title = () => {
        return <View></View>;
    };

    // toc
    const toc = () => {
        return <View></View>;
    };

    return (
        <GestureDetector gesture={gestures}>
            <SafeAreaView className="flex-1">
                <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
                    <Text>{epubMetadata?.title}</Text>
                    <Text>{epubMetadata?.author}</Text>
                    <Text>Genres: {epubMetadata?.genres.join('\n')}</Text>
                    <Text>
                        {epubMetadata?.description
                            ? `Description: ${epubMetadata.description}`
                            : 'No description provided'}
                    </Text>
                </ScrollView>
            </SafeAreaView>
        </GestureDetector>
    );
};

export default Reader;
