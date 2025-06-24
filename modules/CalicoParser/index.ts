// Reexport the native module. On web, it will be resolved to CalicoParserModule.web.ts
// and on native platforms to CalicoParserModule.ts
export * from './src/CalicoParser.types';
export { default } from './src/CalicoParserModule';

