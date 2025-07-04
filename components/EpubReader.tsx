import WebView from 'react-native-webview';
import { Text, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { ReaderManager, ReaderState, generateWebViewHTML } from '@/lib/reader';

interface EpubReaderProps {
    bookKey: string;
    onBack?: () => void;
    onTapMiddle?: () => void;
}

const { width, height } = Dimensions.get('window');

const Reader: React.FC<EpubReaderProps> = ({ bookKey, onTapMiddle }) => {
    const webViewRef = useRef<WebView>(null);

    // Updated state with pagination fields
    const [state, setState] = useState<ReaderState>({
        chunkCache: new Map(),
        pageCache: new Map(), // Add page cache
        content: '',
        currChapter: 0,
        currChunk: 0,
        currPage: 0, // Add current page
        error: null,
        loading: false,
        metadata: null,
    });

    const readerManager = new ReaderManager(
        bookKey,
        state,
        setState,
        { width, height }, // Pass screen dimensions
        {
            wordsPerPage: 250, // Will be auto-calculated
            preserveParagraphs: true,
            fontSize: 16,
            lineHeight: 24,
        },
    );

    useEffect(() => {
        readerManager.loadDocument();
    }, [bookKey]);

    useEffect(() => {
        if (state.metadata) {
            readerManager.loadProgress();
        }
    }, [state.metadata]);

    // Updated to use page navigation instead of chapter navigation
    const handleNavigation = useCallback(
        (direction: 'next' | 'prev') => {
            readerManager.navigateToPage(direction); // Changed from navigateToChapter
            readerManager.saveProgress(); // Save progress on each page turn
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
                scrollEnabled={false} // Disable scrolling for page-based reading
                overScrollMode="never" // Android: disable overscroll
                automaticallyAdjustContentInsets={false}
                contentInset={{ top: 0, left: 0, bottom: 0, right: 0 }}
                renderLoading={() => <ActivityIndicator size="large" />}
                onLoadEnd={() => {
                    // Inject additional JavaScript to ensure no scrolling
                    webViewRef.current?.injectJavaScript(`
                        document.body.style.overflow = 'hidden';
                        document.documentElement.style.overflow = 'hidden';
                        window.scrollTo(0, 0);
                        true;
                    `);
                }}
            />
        </SafeAreaView>
    );
};

export default Reader;
