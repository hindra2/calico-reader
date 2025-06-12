import React from 'react';
import { Reader, ReaderProvider, useReader } from '@epubjs-react-native/core';
import { useFileSystem, FileSystem } from '@epubjs-react-native/expo-file-system';
import { Dimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

interface EpubReaderProps {
    epubUri: string;
    onBack?: () => void;
    onTapMiddle?: () => void;
}

const screenHeight = Dimensions.get('screen').height;

const EpubReader: React.FC<EpubReaderProps> = ({ epubUri, onTapMiddle }) => {
    const { goNext, goPrevious, isLoading, getMeta } = useReader();

    const tap = Gesture.Tap()
        .onEnd(() => {
            // The function you want to be called when tapped
            onTapMiddle?.();
        })
        .runOnJS(true);

    return (
        <GestureDetector gesture={tap}>
            <SafeAreaView className="flex-1">
                <Reader src={epubUri} height={screenHeight} fileSystem={useFileSystem} flow="paginated" />
            </SafeAreaView>
        </GestureDetector>
    );
};

export default EpubReader;
