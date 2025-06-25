import React, { ReactNode } from 'react';
import { Text as RNText } from 'react-native';

interface TextProps {
    className?: string;
    children?: ReactNode;
}

const Text: React.FC<TextProps> = ({ className, children }) => {
    return <RNText className={`text-light dark:{text-dark} ${className}`}>{children}</RNText>;
};

export default Text;
