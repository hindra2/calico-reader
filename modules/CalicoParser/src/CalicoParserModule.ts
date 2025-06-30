import { NativeModule, requireNativeModule } from 'expo';
import { Metadata } from './CalicoParser.types';

declare class CalicoParserModule extends NativeModule {
    parseChapter(filePath: string, chapterPath: string): Promise<String>;
    importMetadata(filePath: string): Promise<Metadata>;
    chunkEpub(filePath: string): Promise<Map<String, Array<String>>>;
}

const nativeModule = requireNativeModule<CalicoParserModule>('CalicoParser');

export default {
    async parseChapter(filePath: string, chapterPath: string): Promise<String> {
        const result = await nativeModule.parseChapter(filePath, chapterPath);
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
