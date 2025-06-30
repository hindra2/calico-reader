import CalicoParser from '@/modules/CalicoParser';
import { Metadata } from '@/modules/CalicoParser';

const loadChapter = async (uri: string, chapterPath: string): Promise<String> => {
    const result = await CalicoParser.parseChapter(uri, chapterPath);
    return result;
};

const importMetadata = async (uri: string): Promise<Metadata> => {
    const result = await CalicoParser.importMetadata(uri);
    return result;
};

const getChunks = async (uri: string): Promise<Map<String, Array<String>>> => {
    const result = await CalicoParser.chunkEpub(uri);
    return result;
};

export { loadChapter, importMetadata, getChunks };
