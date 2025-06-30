import { NativeModule, requireNativeModule } from 'expo';
import { Metadata } from './CalicoParser.types';

declare class CalicoParserModule extends NativeModule {
    parseEpub(filePath: string): Promise<Metadata>;
    importMetadata(filePath: string): Promise<Metadata>;
}

const nativeModule = requireNativeModule<CalicoParserModule>('CalicoParser');

export default {
    async parseEpub(filePath: string): Promise<Metadata> {
        const result = await nativeModule.parseEpub(filePath);
        return result;
    },

    async importMetadata(filePath: string): Promise<Metadata> {
        const result = await nativeModule.importMetadata(filePath);
        return result;
    },

    async chunkEpub(filePath: string): Promise<Map<String, Array<String>>> {
        const result = await nativeModule.chunkEpub(filePath);
        return result;
    },
};
