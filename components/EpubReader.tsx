import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Reader, ReaderProvider } from '@epubjs-react-native/core';
import { useFileSystem } from '@epubjs-react-native/expo-file-system';

interface EpubReaderProps {
    epubUri: string;
    onBack?: () => void;
}

const EpubReader: React.FC<EpubReaderProps> = ({ epubUri, onBack }) => {
    return (
        <ReaderProvider>
            <View className="flex-1 bg-black">
                <Reader
                    src={epubUri}
                    fileSystem={useFileSystem}
                    enableSwipe={true}
                    enableSelection={true}
                    flow="paginated"
                />
            </View>
        </ReaderProvider>
    );
};

export default EpubReader;
