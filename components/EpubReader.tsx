import React, { useEffect, useState } from 'react';
import { Dimensions, View, Text, FlatList, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

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

    // gestures
    const tap = Gesture.Tap()
        .onEnd(event => {
            const { x } = event;

            const leftThird = screenWidth / 3;
            const rightThird = (screenWidth * 2) / 3;

            if (x < leftThird) {
                console.log('left tap');
            } else if (x > rightThird) {
                console.log('right tap');
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
                console.log('prev page');
            } else if (event.velocityX < -500) {
                console.log('next page');
            }
        })
        .runOnJS(true);

    const gestures = Gesture.Race(tap, swipe);

    // rendering
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
        <GestureDetector gesture={gestures}>
            <SafeAreaView className="flex-1 px-10">
                <FlatList
                    data={chapters}
                    keyExtractor={item => item.src}
                    renderItem={({ item }) => (
                        <Pressable className="py-2">
                            <Text className="text-base">{item.title}</Text>
                        </Pressable>
                    )}
                />
            </SafeAreaView>
        </GestureDetector>
    );
};

export default Reader;
