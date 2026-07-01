import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import ScaledText from './ScaledText';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, onBack, right }) => {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
      <Pressable onPress={onBack ?? (() => nav.goBack())} style={styles.btn}>
        <Ionicons name="chevron-back" size={22} color={colors.white} />
      </Pressable>
      <ScaledText style={styles.title}>{title}</ScaledText>
      {right ?? <View style={styles.btn} />}
    </View>
  );
};

const makeStyles = (colors: Palette) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  btn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.white, fontSize: 16, fontWeight: '700' },
});

export default ScreenHeader;
