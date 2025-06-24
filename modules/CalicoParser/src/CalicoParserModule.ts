import { NativeModule, requireNativeModule } from 'expo';

declare class CalicoParserModule extends NativeModule {
    parseEpub(filePath: string): Promise<string>;
}

const nativeModule = requireNativeModule<CalicoParserModule>('CalicoParser');

export default {
    async parseEpub(filePath: string): Promise<string> {
        const result = await nativeModule.parseEpub(filePath);
        return result;
    },
};
