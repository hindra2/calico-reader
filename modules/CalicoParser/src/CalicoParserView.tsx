import { requireNativeView } from 'expo';
import * as React from 'react';

import { CalicoParserViewProps } from './CalicoParser.types';

const NativeView: React.ComponentType<CalicoParserViewProps> =
  requireNativeView('CalicoParser');

export default function CalicoParserView(props: CalicoParserViewProps) {
  return <NativeView {...props} />;
}
