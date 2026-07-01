import React from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../theme/useColors';
import ScaledText from '../ScaledText';
import { useSettingsStyles } from './settingsStyles';

interface NavRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  accentColor?: string;
}

const NavRow: React.FC<NavRowProps> = ({
  icon,
  label,
  value,
  onPress,
  destructive,
  accentColor,
}) => {
  const colors = useColors();
  const styles = useSettingsStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && { opacity: 0.6 }]}
    >
      <View style={[styles.rowIcon, accentColor ? { backgroundColor: accentColor + '22' } : null]}>
        <Ionicons
          name={icon}
          size={17}
          color={accentColor ?? (destructive ? colors.red : colors.white)}
        />
      </View>
      <ScaledText style={[styles.rowLabel, ...(destructive ? [{ color: colors.red }] : [])]}>{label}</ScaledText>
      {value !== undefined && <ScaledText style={styles.rowValue}>{value}</ScaledText>}
      {onPress && <Ionicons name="chevron-forward" size={14} color={colors.textFade} />}
    </Pressable>
  );
};

export default NavRow;
