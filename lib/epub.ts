import CalicoParser from '@/modules/CalicoParser';
import { Metadata } from '@/modules/CalicoParser';

const loadEpub = async (uri: string): Promise<Metadata> => {
    const result = await CalicoParser.parseEpub(uri);
    console.log('metadata:', result);
    return result;
};

export { loadEpub };
