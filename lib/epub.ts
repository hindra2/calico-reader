import CalicoParser from '@/modules/CalicoParser';
import { Metadata } from '@/modules/CalicoParser';

const loadChapter = async (uri: string, chapterPath: string): Promise<String> => {
    let result = '';
    try {
        result = await CalicoParser.parseChapter(uri, chapterPath);
    } catch (e) {
        console.error(e);
    }
    return result;
};

const importMetadata = async (uri: string): Promise<Metadata | null> => {
    let result = null;
    try {
        result = await CalicoParser.importMetadata(uri);
    } catch (e) {
        console.error(e);
    }
    return result;
};

const parseChunk = async (uri: string, chapterPaths: Array<string>): Promise<Record<string, string>> => {
    const result = await CalicoParser.parseChunk(uri, chapterPaths);
    return result;
};

const getChunks = async (uri: string): Promise<Record<string, string[]>> => {
    const result = await CalicoParser.chunkEpub(uri);
    return result;
};

const cleanCache = async (): Promise<void> => {
    CalicoParser.clean();
};

export { loadChapter, importMetadata, getChunks, parseChunk, cleanCache };
