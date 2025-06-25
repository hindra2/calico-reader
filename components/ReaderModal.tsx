import { Text, View, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import React from 'react';

interface ReaderModalProps {
    visible: boolean;
    onClose?: () => void;
    onBack: () => void;
}

const ReaderModal: React.FC<ReaderModalProps> = ({ visible, onClose, onBack }) => {
    const router = useRouter();

    const handleBack = () => {
        router.back();
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <Pressable className="flex h-full bg-gray-200 opacity-50" onPress={onClose}>
                <View>
                    <Text>TEST</Text>
                </View>
            </Pressable>
        </Modal>
    );
};

export default ReaderModal;
