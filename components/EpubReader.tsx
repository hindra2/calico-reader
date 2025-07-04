import WebView from 'react-native-webview';
import { Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useState, useRef } from 'react';

import { ReaderManager, ReaderState, generateWebViewHTML } from '@/lib/reader';

interface EpubReaderProps {
    bookKey: string;
    onBack?: () => void;
    onTapMiddle?: () => void;
}

// const screenWidth = Dimensions.get('screen').width;
// const screenHeight = Dimensions.get('screen').height;

const Reader: React.FC<EpubReaderProps> = ({ bookKey, onTapMiddle }) => {
    const webViewRef = useRef<WebView>(null);

    // Consolidated state
    const [state, setState] = useState<ReaderState>({
        chunkCache: new Map(),
        content: '',
        currChapter: 0,
        currChunk: 0,
        error: null,
        loading: false,
        metadata: null,
    });

    const readerManager = new ReaderManager(bookKey, state, setState);

    useEffect(() => {
        readerManager.loadDocument();
    }, [bookKey]);

    useEffect(() => {
        if (state.metadata) {
            readerManager.loadProgress();
        }
    }, [state.metadata]);

    const handleNavigation = useCallback(
        (direction: 'next' | 'prev') => {
            readerManager.navigateToChapter(direction);
        },
        [readerManager],
    );

    const handleWebViewMessage = useCallback(
        (event: any) => {
            const message = event.nativeEvent.data;

            switch (message) {
                case 'prev':
                    handleNavigation('prev');
                    break;
                case 'next':
                    handleNavigation('next');
                    break;
                case 'middle':
                    onTapMiddle?.();
                    break;
            }
        },
        [handleNavigation, onTapMiddle],
    );

    if (state.loading && !state.content) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" />
            </SafeAreaView>
        );
    }

    if (state.error) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center px-4">
                <Text className="text-red-500 text-center">{state.error}</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1">
            <WebView
                ref={webViewRef}
                source={{ html: generateWebViewHTML(state.content) }}
                style={{ flex: 1 }}
                onMessage={handleWebViewMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={false}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                bounces={false}
                scrollEnabled={true}
                renderLoading={() => <ActivityIndicator size="large" />}
            />
        </SafeAreaView>
    );
};

export default Reader;
