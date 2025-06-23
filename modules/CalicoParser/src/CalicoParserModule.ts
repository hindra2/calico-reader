import { NativeModule, requireNativeModule } from 'expo';

import { CalicoParserModuleEvents } from './CalicoParser.types';

declare class CalicoParserModule extends NativeModule<CalicoParserModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<CalicoParserModule>('CalicoParser');
