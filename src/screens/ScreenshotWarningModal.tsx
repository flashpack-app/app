import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import PillButton from '../components/PillButton';
import { t } from '../services/i18n';

interface Props {
  visible: boolean;
  onClose: () => void;
  membersCount: number;
}

const ScreenshotWarningModal: React.FC<Props> = ({ visible, onClose, membersCount }) => {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="camera" size={20} color={colors.red} />
          </View>
          <Text style={styles.title}>{t('screenshot_warning_title')}</Text>
          <Text style={styles.body}>
            {t('screenshot_warning_body')}
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• {membersCount - 1 === 1 ? t('screenshot_warning_people_notified_one') : t('screenshot_warning_people_notified_other', { count: membersCount - 1 })}</Text>
            <Text style={styles.listItem}>• {t('screenshot_warning_logged')}</Text>
            <Text style={styles.listItem}>• {t('screenshot_warning_repeat')}</Text>
          </View>
          <View style={styles.buttons}>
            <PillButton variant="dim" label={t('close')} onPress={onClose} style={{ flex: 1, height: 38 }} />
            <PillButton variant="red" label={t('gotIt')} onPress={onClose} style={{ flex: 1, height: 38 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: Palette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#161616',
    borderColor: '#2a2a2a',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 18,
    width: '100%',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,69,58,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.white, fontSize: 14, fontWeight: '700' },
  body: { color: colors.textSecondary, fontSize: 11, lineHeight: 16 },
  list: {
    backgroundColor: 'rgba(255,69,58,0.07)',
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  listItem: { color: colors.textSecondary, fontSize: 11 },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 6 },
});

export default ScreenshotWarningModal;
