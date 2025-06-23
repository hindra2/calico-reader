import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './CalicoParser.types';

type CalicoParserModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class CalicoParserModule extends NativeModule<CalicoParserModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(CalicoParserModule, 'CalicoParserModule');
