import React, { useState } from 'react';
import { Modal, View, Pressable } from 'react-native';
import Text from './Text';

let trigger: ((title: string, message: string) => void) | null = null;

const Alert: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');

    const show = (title: string, message: string) => {
        setTitle(title);
        setMessage(message);
        setVisible(true);
    };

    trigger = show;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent={true}
            navigationBarTranslucent={true}
        >
            <View className="absolute inset-0 items-center justify-center bg-black/50">
                <View className="bg-white dark:bg-neutral-800 p-6 rounded-xl w-4/5">
                    <Text className="text-lg font-bold text-black dark:text-white mb-4">{title}</Text>
                    <Text className="text-black dark:text-white mb-6">{message}</Text>
                    <Pressable onPress={() => setVisible(false)} className="self-end px-4 py-2 bg-blue-500 rounded-lg">
                        <Text className="text-white">OK</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
};

export const showAlert = (title: string, message: string) => {
    if (trigger) trigger(title, message);
    else console.warn('Alert component not mounted yet.');
};

export default Alert;
