import WebView from 'react-native-webview';
import { Text, ActivityIndicator, Dimensions, View } from 'react-native';
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
    const [webViewLoaded, setWebViewLoaded] = useState(false);

    const [state, setState] = useState<ReaderState>({
        chunkCache: new Map(),
        pageCache: new Map(),
        content: '',
        currChapter: 0,
        currChunk: 0,
        currPage: 0,
        error: null,
        loading: false,
        metadata: null,
    });

    const readerManager = new ReaderManager(
        bookKey,
        state,
        setState,
        { width, height },
        {
            wordsPerPage: 250,
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

    useEffect(() => {
        setWebViewLoaded(false);
    }, [state.content]);

    const handleNavigation = useCallback(
        (direction: 'next' | 'prev') => {
            readerManager.navigateToPage(direction);
            readerManager.saveProgress();
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
            <View className="flex-1">
                <SafeAreaView className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="blue" />
                </SafeAreaView>
            </View>
        );
    }

    if (state.error) {
        return (
            <View className="flex-1 bg-black">
                <SafeAreaView className="flex-1 justify-center items-center p-4">
                    <Text className="text-red-500 text-center">{state.error}</Text>
                </SafeAreaView>
            </View>
        );
    }

    if (state.content) {
        return (
            <View className="flex-1 bg-black">
                <SafeAreaView className="flex-1">
                    {!webViewLoaded && (
                        <View className="absolute inset-0 justify-center items-center z-10">
                            <ActivityIndicator size="large" color="blue" />
                        </View>
                    )}

                    <WebView
                        ref={webViewRef}
                        source={{ html: generateWebViewHTML(state.content) }}
                        className="flex-1"
                        onMessage={handleWebViewMessage}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        startInLoadingState={false}
                        scalesPageToFit={false}
                        showsVerticalScrollIndicator={false}
                        showsHorizontalScrollIndicator={false}
                        bounces={false}
                        scrollEnabled={false}
                        overScrollMode="never"
                        automaticallyAdjustContentInsets={false}
                        contentInset={{ top: 0, left: 0, bottom: 0, right: 0 }}
                        onLoadEnd={() => {
                            webViewRef.current?.injectJavaScript(`
                                document.body.style.overflow = 'hidden';
                                document.documentElement.style.overflow = 'hidden';
                                window.scrollTo(0, 0);
                                true;
                            `);
                            setTimeout(() => setWebViewLoaded(true), 100);
                        }}
                    />
                </SafeAreaView>
            </View>
        );
    }
};

export default Reader;
