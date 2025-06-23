import React from 'react';
import { Pressable, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

interface FilePickerProps {
    className: string;
    onChange: (path: string) => void;
}

const FilePicker: React.FC<FilePickerProps> = ({ className, onChange }) => {
    const pickFile = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: '*/*',
        });
        if (!result.canceled) {
            const filePath = result.assets[0].uri;
            onChange(filePath);
        }
    };

    return (
        <View className={className}>
            <Pressable onPress={pickFile}>
                <Text className="text-dark dark:text-white">Pick a file!</Text>
            </Pressable>
        </View>
    );
};

export default FilePicker;
