import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Pressable } from 'react-native';
import { EvilIcons } from '@expo/vector-icons';

import { deleteMMKV } from '@/lib/mmkv';
import { Metadata } from '@/modules/CalicoParser';
import { bookEventEmitter } from '@/lib/EventEmitter';

import Text from './ui/Text';

interface BookCardProps {
    metadata: Metadata;
    isSelected: boolean;
    onToggleSelect: () => void;
}

const BookCard: React.FC<BookCardProps> = ({ isSelected, metadata, onToggleSelect }) => {
    const router = useRouter();

    const [isPressed, setIsPressed] = useState<boolean>(false);

    const handlePress = () => {
        router.push({
            params: { bookKey: metadata.key },
            pathname: '/reader',
        });
    };

    const handleHold = () => {
        console.log('holding');
        onToggleSelect();
    };

    const handleDelete = async () => {
        console.log('delete book: ', metadata.title);
        deleteMMKV(metadata.key);
        bookEventEmitter.emit('booksUpdated');
    };

    return (
        <Pressable
            className={`items-center justify-center w-full rounded-lg ${isSelected ? 'bg-blue-300' : isPressed ? 'bg-gray-400' : 'bg-gray-200'}`}
            onPress={handlePress}
            onLongPress={handleHold}
            onPressIn={() => setIsPressed(true)}
            onPressOut={() => setIsPressed(false)}
        >
            <View>
                <Text>Cover image</Text>
            </View>
            <Text>{metadata.title}</Text>
            <Pressable onPress={handleDelete}>
                <EvilIcons name="trash" size={24} color="black" />
            </Pressable>
        </Pressable>
    );
};

export default BookCard;
