import WebView from 'react-native-webview';
import { Text, ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useEpubReader } from '@/lib/reader';
import { generateHTML } from '@/lib/htmlContent';

interface EpubReaderProps {
    bookKey: string;
    onBack?: () => void;
    onTapMiddle?: () => void;
}

const Reader: React.FC<EpubReaderProps> = ({ bookKey, onTapMiddle }) => {
    const webViewRef = useRef<WebView>(null);
    const [webViewKey, setWebViewKey] = useState(0);

    const { state, handleWebViewMessage, cleanup } = useEpubReader(bookKey, webViewRef);

    useEffect(() => {
        if (Object.keys(state.chapterContents).length > 0 && state.chapterPaths.length > 0) {
            setWebViewKey(prev => prev + 1);
        }
    }, [state.chapterContents, state.chapterPaths]);

    // Handle WebView messages
    const handleMessage = useCallback(
        (event: any) => {
            try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'middleTap') {
                    onTapMiddle?.();
                } else {
                    handleWebViewMessage(event.nativeEvent.data);
                }
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        },
        [onTapMiddle, handleWebViewMessage],
    );

    // Generate HTML content
    const htmlContent = React.useMemo(() => {
        if (Object.keys(state.chapterContents).length === 0 || state.chapterPaths.length === 0) {
            return '';
        }
        return generateHTML(state.chapterContents, state.chapterPaths);
    }, [state.chapterContents, state.chapterPaths]);

    // Cleanup on unmount
    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    // Loading state
    if (state.loading && Object.keys(state.chapterContents).length === 0) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="blue" />
                <Text className="text-gray-600 mt-4">Loading book...</Text>
            </SafeAreaView>
        );
    }

    // Error state
    if (state.error) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center p-4">
                <Text className="text-red-500 text-center text-lg mb-4">Error loading book</Text>
                <Text className="text-red-400 text-center">{state.error}</Text>
            </SafeAreaView>
        );
    }

    // No content state
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
                    onMessage={handleMessage}
                    className="flex-1"
                    javaScriptEnabled={true}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    scrollEnabled={false}
                    overScrollMode="never"
                    onError={error => {
                        console.error('WebView error:', error);
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
