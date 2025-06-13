import * as FileSystem from 'expo-file-system';

const parseDirectory = async (path: string) => {
    try {
        const contents = await FileSystem.StorageAccessFramework.readDirectoryAsync(path);
        console.log(contents);

        for (const content of contents) {
            console.log(content);
        }
    } catch (error) {
        console.error(error);
    }
};

export { parseDirectory };
