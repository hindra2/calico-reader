import * as FileSystem from 'expo-file-system';
import { Text, TouchableOpacity } from 'react-native';

const DirectoryPicker = ({ onChange }) => {
    const pickDirectory = async () => {
        const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permission.granted) {
            const uri = permission.directoryUri;
            onChange(uri);
        }
    };

    return (
        <TouchableOpacity onPress={pickDirectory} className="bg-blue-500 px-4 py-2 rounded">
            <Text className="text-white font-medium">Select Directory</Text>
        </TouchableOpacity>
    );
};

export default DirectoryPicker;
