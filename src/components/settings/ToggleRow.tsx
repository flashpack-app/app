import React from 'react';
import { View, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import ScaledText from '../ScaledText';
import { settingsStyles as styles } from './settingsStyles';

interface ToggleRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  accentColor?: string;
  disabled?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  icon,
  label,
  value,
  onToggle,
  accentColor,
  disabled,
}) => (
  <View style={[styles.row, disabled && { opacity: 0.4 }]}>
    <View style={[styles.rowIcon, accentColor ? { backgroundColor: accentColor + '22' } : null]}>
      <Ionicons
        name={icon}
        size={17}
        color={disabled ? colors.textFade : (accentColor ?? colors.white)}
      />
    </View>
    <ScaledText style={[styles.rowLabel, disabled ? { color: colors.textFade } : {}]}>{label}</ScaledText>
    <Switch
      value={value}
      onValueChange={disabled ? undefined : onToggle}
      trackColor={{ false: '#333', true: colors.yellow + '66' }}
      thumbColor={value ? colors.yellow : '#888'}
      ios_backgroundColor="#333"
      disabled={disabled}
    />
  </View>
);

export default ToggleRow;
