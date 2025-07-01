import { NativeModule, requireNativeModule } from 'expo';
import { Metadata } from './CalicoParser.types';

declare class CalicoParserModule extends NativeModule {
    parseChapter(filePath: string, chapterPath: string): Promise<string>;
    importMetadata(filePath: string): Promise<Metadata>;
    chunkEpub(filePath: string): Promise<Record<string, string[]>>;
    parseChunk(filePath: string, chapterPaths: Array<string>): Promise<Record<string, string>>;
    clean(): void;
}

const nativeModule = requireNativeModule<CalicoParserModule>('CalicoParser');

export default {
    async parseChapter(filePath: string, chapterPath: string): Promise<string> {
        const result = await nativeModule.parseChapter(filePath, chapterPath);
        return result;
    },

    async parseChunk(filePath: string, chapterPaths: Array<string>): Promise<Record<string, string>> {
        const result = await nativeModule.parseChunk(filePath, chapterPaths);
        return result;
    },

    async importMetadata(filePath: string): Promise<Metadata> {
        const result = await nativeModule.importMetadata(filePath);
        return result;
    },

    async chunkEpub(filePath: string): Promise<Record<string, string[]>> {
        const result = await nativeModule.chunkEpub(filePath);
        return result;
    },

    async clean(): Promise<void> {
        nativeModule.clean();
    },
};
