import { View, Pressable, StatusBar, Dimensions } from 'react-native';
import Text from './ui/Text';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface ReaderModalProps {
    visible: boolean;
    onClose?: () => void;
    onBack?: () => void;
}

const ReaderModal: React.FC<ReaderModalProps> = ({ visible, onClose, onBack }) => {
    const topTranslateY = useSharedValue(-SCREEN_HEIGHT);
    const bottomTranslateY = useSharedValue(SCREEN_HEIGHT);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            topTranslateY.value = -SCREEN_HEIGHT;
            bottomTranslateY.value = SCREEN_HEIGHT;

            setTimeout(() => {
                opacity.value = withTiming(1, { duration: 300 });
                topTranslateY.value = withSpring(0, {
                    damping: 45,
                    stiffness: 500,
                });
                bottomTranslateY.value = withSpring(0, {
                    damping: 45,
                    stiffness: 500,
                });
            }, 10);
        } else {
            opacity.value = withTiming(0, { duration: 250 });
            topTranslateY.value = withTiming(-SCREEN_HEIGHT, { duration: 250 });
            bottomTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
        }
    }, [visible]);

    const topModalStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: topTranslateY.value }],
    }));

    const bottomModalStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: bottomTranslateY.value }],
    }));

    const backgroundStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1000,
                },
                backgroundStyle,
            ]}
            pointerEvents={visible ? 'auto' : 'none'}
        >
            {/* Background overlay */}
            <Pressable
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                }}
                onPress={onClose}
            />

            {/* Top Modal */}
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        width: SCREEN_WIDTH,
                        zIndex: 1001,
                    },
                    topModalStyle,
                ]}
            >
                <View style={{ height: StatusBar.currentHeight || 0, backgroundColor: 'black', width: '100%' }} />
                <View className="flex-row bg-black items-center px-4 py-4">
                    <Pressable onPress={onBack} className="flex">
                        <Ionicons name="arrow-back-outline" size={40} color="white" />
                    </Pressable>
                    <View className="flex-1 items-center">
                        <Text className="text-white text-lg font-medium">Top Modal</Text>
                    </View>
                    <View className="w-10"></View>
                </View>
            </Animated.View>

            {/* Bottom Modal */}
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        width: SCREEN_WIDTH,
                        zIndex: 1001,
                    },
                    bottomModalStyle,
                ]}
            >
                <View className="flex-row bg-black items-center px-4 py-4">
                    <View className="flex-1 items-center">
                        <Text className="text-white text-lg font-medium">Bottom Modal</Text>
                    </View>
                </View>
            </Animated.View>
        </Animated.View>
    );
};

export default ReaderModal;
