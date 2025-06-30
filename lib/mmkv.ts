import * as Crypto from 'expo-crypto';
import { MMKV } from 'react-native-mmkv';

import { Metadata } from '@/modules/CalicoParser';
import { showAlert } from '@/components/ui/Alert';

export const storage = new MMKV();

export const importMMKV = async (metadata: Metadata) => {
    // hash title into key
    const key = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, metadata.title.trim().toLowerCase());
    if (checkDuplicateKey(key)) {
        showAlert('Duplicate Book', 'This book already exists in your library.');
        return;
    }

    metadata.key = key;
    const value = JSON.stringify(metadata);

    // add to mmkv
    storage.set('books:' + key, value);

    // update books:all
    let currentList: string[] = [];
    // check if empty / doesn't exist
    try {
        const raw = storage.getString('books:all');
        currentList = raw ? JSON.parse(raw) : [];
    } catch {
        currentList = [];
    }

    if (!currentList.includes(key)) {
        currentList.push(key);
        storage.set('books:all', JSON.stringify(currentList));
    }
};

export const deleteMMKV = (key: string) => {
    storage.delete(key);

    const raw = storage.getString('books:all');
    if (raw) {
        const list = JSON.parse(raw) as string[];
        const updated = list.filter(id => id !== key);
        storage.set('books:all', JSON.stringify(updated));
    }
};

export const checkDuplicateKey = (key: string): boolean => {
    return storage.contains(key);
};
