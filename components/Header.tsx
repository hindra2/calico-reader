import { View, Pressable } from 'react-native';
import { EvilIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from './ui/Text';

interface HeaderProps {
    hasSelection: boolean;
    onBatchDelete: () => void;
}

const Header: React.FC<HeaderProps> = ({ hasSelection, onBatchDelete }) => {
    return (
        <SafeAreaView className="bg-gray-200 w-full" edges={['top']}>
            <View className="flex-row items-center justify-between p-5 bg-gray-200 w-full">
                <Text className="text-lg font-bold">All Books</Text>
                {hasSelection && (
                    <Pressable onPress={onBatchDelete}>
                        <EvilIcons name="trash" size={24} color="black" />
                    </Pressable>
                )}
            </View>
        </SafeAreaView>
    );
};
export default Header;
