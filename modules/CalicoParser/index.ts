// Reexport the native module. On web, it will be resolved to CalicoParserModule.web.ts
// and on native platforms to CalicoParserModule.ts
export { default } from './src/CalicoParserModule';
export { default as CalicoParserView } from './src/CalicoParserView';
export * from  './src/CalicoParser.types';
