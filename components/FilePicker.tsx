import React from 'react';
import { Pressable, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { importMetadata } from '@/lib/epub';
import { importMMKV } from '@/lib/mmkv';
import { bookEventEmitter } from '@/lib/EventEmitter';

interface FilePickerProps {
    className: string;
}

const FilePicker: React.FC<FilePickerProps> = ({ className }) => {
    const pickFile = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: '*/*',
        });

        if (result.canceled) {
            return;
        }

        const asset = result.assets[0];
        const uri = asset.uri;
        const name = asset.name;
        const destPath = `${FileSystem.documentDirectory}books/${name}`;

        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}books`, { intermediates: true });
        await FileSystem.copyAsync({ from: uri, to: destPath });

        const metadata = await importMetadata(destPath);
        metadata.path = destPath;

        await importMMKV(metadata);
        bookEventEmitter.emit('booksUpdated');
    };

    return (
        <View className={className}>
            <Pressable onPress={pickFile}>
                <Text className="text-dark dark:text-white">Import</Text>
            </Pressable>
        </View>
    );
};

export default FilePicker;
