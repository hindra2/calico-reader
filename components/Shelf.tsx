import React, { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { EventEmitter } from 'expo';
import Text from './ui/Text';

import { Metadata } from '@/modules/CalicoParser';
import BookCard from './BookCard';
import { storage } from '@/lib/mmkv';
import { bookEventEmitter } from '@/lib/EventEmitter';

interface BookItem {
    id: string;
    metadata: Metadata;
}

const Shelf = () => {
    const [books, setBooks] = useState<BookItem[]>([]);

    const fetchAllBooks = (): BookItem[] => {
        const rawKeys = storage.getString('books:all');
        if (!rawKeys) {
            return [];
        }

        let keys: string[] = [];

        try {
            keys = JSON.parse(rawKeys);
        } catch (e) {
            console.error('failed to parse books:all: ', e);
            return [];
        }

        const books: BookItem[] = [];

        for (const key of keys) {
            const rawBook = storage.getString(key);
            if (!rawBook) {
                continue;
            }

            try {
                const book = JSON.parse(rawBook);
                books.push({
                    id: key,
                    metadata: book,
                });
            } catch (e) {
                console.warn(`Failed to parse book with key: ${key}`, e);
            }
        }

        return books;
    };

    useEffect(() => {
        setBooks(fetchAllBooks());

        const updateHandler = () => {
            setBooks(fetchAllBooks());
        };

        const subscription = bookEventEmitter.addListener('booksUpdated', updateHandler);
        return () => {
            subscription.remove();
        };
    }, []);

    const EmptyView = () => {
        return (
            <View className="flex w-full h-full items-center justify-center">
                <Text>Import some books or add a directory!</Text>
            </View>
        );
    };

    return (
        <FlatList
            className="flex w-full"
            data={books}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <BookCard metadata={item.metadata} />}
            contentContainerStyle={{ padding: 16 }}
            ItemSeparatorComponent={() => <View className="h-[1px] bg-gray-400 w-full" />}
            ListEmptyComponent={EmptyView}
        />
    );
};

export default Shelf;
