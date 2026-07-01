import { StyleSheet } from 'react-native';
import type { Palette } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';

const makeSettingsStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: { flex: 1, backgroundColor: colors.black },
    scroll: { padding: 12, gap: 14, paddingBottom: 40 },
    section: { gap: 6 },
    sectionLabel: {
      color: colors.textDim,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      paddingHorizontal: 4,
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowIcon: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: colors.surfaceSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: { flex: 1, color: colors.white, fontSize: 13, fontWeight: '500' },
    rowValue: { color: colors.textFade, fontSize: 12, marginRight: 4 },
  });

export function useSettingsStyles() {
  return useThemedStyles(makeSettingsStyles);
}
