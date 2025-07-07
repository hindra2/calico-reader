import WebView from 'react-native-webview';
import { Text, ActivityIndicator, Dimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { ReaderManager, ReaderState } from '@/lib/reader';
import { generateHTML } from '@/lib/htmlContent';

interface EpubReaderProps {
    bookKey: string;
    onBack?: () => void;
    onTapMiddle?: () => void;
}

const { width, height } = Dimensions.get('window');

const Reader: React.FC<EpubReaderProps> = ({ bookKey, onTapMiddle }) => {
    const webViewRef = useRef<WebView>(null);
    const readerManagerRef = useRef<ReaderManager | null>(null);
    const insets = useSafeAreaInsets();

    // Add a key to force WebView re-render when content changes
    const [webViewKey, setWebViewKey] = useState(0);

    // Calculate actual available space
    const availableWidth = width;
    const availableHeight = height - insets.top;

    const [state, setState] = useState<ReaderState>({
        chunkCache: new Map(),
        chapterContents: {},
        chapterPaths: [],
        currChapter: 0,
        currChunk: 0,
        currPage: 0,
        currChapterPath: '',
        totalChapters: 0,
        totalPagesInChapter: 0,
        error: null,
        loading: false,
        metadata: null,
    });

    // Initialize reader
    useEffect(() => {
        readerManagerRef.current = new ReaderManager(bookKey, state, setState, webViewRef);
        readerManagerRef.current.loadDocument();
    }, [bookKey]);

    // Force WebView refresh when content changes
    useEffect(() => {
        if (Object.keys(state.chapterContents).length > 0 && state.chapterPaths.length > 0) {
            // Force WebView to reload with new content
            setWebViewKey(prev => prev + 1);
        }
    }, [state.chapterContents, state.chapterPaths]);

    // Restore saved position when metadata is loaded
    useEffect(() => {
        const restorePosition = async () => {
            if (readerManagerRef.current && state.metadata && !state.loading) {
                await readerManagerRef.current.restorePosition();
            }
        };

        restorePosition();
    }, [state.metadata, state.loading]);

    const handleWebViewMessage = useCallback(
        (event: any) => {
            try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'middleTap') {
                    onTapMiddle?.();
                } else {
                    readerManagerRef.current?.handleWebViewMessage(event.nativeEvent.data);
                }
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        },
        [onTapMiddle],
    );

    // Auto-save position when chapter or page changes
    useEffect(() => {
        if (readerManagerRef.current && state.currChapter >= 0 && state.currPage >= 0) {
            readerManagerRef.current.savePosition();
        }
    }, [state.currChapter, state.currPage, state.currChunk]);

    // Memoize the HTML to avoid unnecessary regeneration
    const htmlContent = React.useMemo(() => {
        if (Object.keys(state.chapterContents).length === 0 || state.chapterPaths.length === 0) {
            return '';
        }
        return generateHTML(state.chapterContents, state.chapterPaths);
    }, [state.chapterContents, state.chapterPaths]);

    if (state.loading && Object.keys(state.chapterContents).length === 0) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="blue" />
                <Text className="text-gray-600 mt-4">Loading book...</Text>
            </SafeAreaView>
        );
    }

    if (state.error) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center p-4">
                <Text className="text-red-500 text-center text-lg mb-4">Error loading book</Text>
                <Text className="text-red-400 text-center">{state.error}</Text>
            </SafeAreaView>
        );
    }

    if (!htmlContent) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center">
                <Text className="text-gray-500">No content available</Text>
            </SafeAreaView>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <SafeAreaView className="flex-1">
                <WebView
                    key={webViewKey}
                    ref={webViewRef}
                    source={{ html: htmlContent }}
                    onMessage={handleWebViewMessage}
                    className="flex-1"
                    javaScriptEnabled={true}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    scrollEnabled={false}
                    overScrollMode="never"
                    onError={error => {
                        console.error('WebView error:', error);
                        setState(prev => ({ ...prev, error: 'Failed to load content' }));
                    }}
                    cacheEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={false}
                />
            </SafeAreaView>
        </View>
    );
};

export default Reader;
