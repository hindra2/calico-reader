import React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { EvilIcons } from '@expo/vector-icons';
import { EventEmitter } from 'expo';

import { Metadata } from '@/modules/CalicoParser';
import { deleteMMKV } from '@/lib/mmkv';
import { bookEventEmitter } from '@/lib/EventEmitter';

import Text from './ui/Text';

interface BookCardProps {
    metadata: Metadata;
}

const BookCard: React.FC<BookCardProps> = ({ metadata }) => {
    const router = useRouter();

    const handlePress = () => {
        console.log('pressed book uri: ', metadata.path);
        router.push({
            params: { fileUri: metadata.path },
            pathname: '/reader',
        });
    };

    const handleDelete = async () => {
        console.log('delete book: ', metadata.title);
        await deleteMMKV(metadata.key);
        bookEventEmitter.emit('booksUpdated');
    };

    return (
        <Pressable className="items-center justify-center bg-gray-200 w-full rounded-lg" onPress={handlePress}>
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
