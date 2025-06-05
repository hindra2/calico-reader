import React, { useState } from 'react';
import { Switch as RNSwitch } from 'react-native';

interface SwitchProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
    className?: string;
}

const Switch: React.FC<SwitchProps> = ({ value, onValueChange, className }) => {
    return (
        <RNSwitch
            className={className}
            trackColor={{ false: '', true: '' }}
            thumbColor={value ? '' : ''}
            onValueChange={onValueChange}
            value={value}
        />
    );
};

export default Switch;
