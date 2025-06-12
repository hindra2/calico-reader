import { StatusBar } from 'expo-status-bar';
import { Platform, Text, View, Modal, Pressable } from 'react-native';
import React from 'react';

interface ReaderModalProps {
    visible: boolean;
    onClose?: () => void;
    onBack: () => void;
}

const ReaderModal: React.FC<ReaderModalProps> = ({ visible, onClose, onBack }) => {
    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <Pressable className="flex h-full" onPress={onClose}>
                <View>
                    <Text>TEST</Text>
                </View>
            </Pressable>
        </Modal>
    );
};

export default ReaderModal;
