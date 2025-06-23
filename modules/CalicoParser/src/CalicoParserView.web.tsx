import * as React from 'react';

import { CalicoParserViewProps } from './CalicoParser.types';

export default function CalicoParserView(props: CalicoParserViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
