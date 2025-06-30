import CalicoParser from '@/modules/CalicoParser';
import { Metadata } from '@/modules/CalicoParser';

const loadEpub = async (uri: string): Promise<Metadata> => {
    const result = await CalicoParser.parseEpub(uri);
    return result;
};

const importMetadata = async (uri: string): Promise<Metadata> => {
    const result = await CalicoParser.importMetadata(uri);
    return result;
};

const getChunks = async (uri: string): Promise<Map<String, Array<String>>> => {
    const result = await CalicoParser.chunkEpub(uri);
    console.log(result);
    return result;
};

export { loadEpub, importMetadata, getChunks };
