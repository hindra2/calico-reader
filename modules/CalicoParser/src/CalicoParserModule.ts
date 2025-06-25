import { NativeModule, requireNativeModule } from 'expo';
import { Metadata } from './CalicoParser.types';

declare class CalicoParserModule extends NativeModule {
    parseEpub(filePath: string): Promise<Metadata>;
}

const nativeModule = requireNativeModule<CalicoParserModule>('CalicoParser');

export default {
    async parseEpub(filePath: string): Promise<Metadata> {
        const result = await nativeModule.parseEpub(filePath);
        return result;
    },
};
