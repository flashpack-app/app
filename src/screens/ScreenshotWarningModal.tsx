import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import PillButton from '../components/PillButton';

interface Props {
  visible: boolean;
  onClose: () => void;
  membersCount: number;
}

const ScreenshotWarningModal: React.FC<Props> = ({ visible, onClose, membersCount }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="camera" size={20} color={colors.red} />
          </View>
          <Text style={styles.title}>screenshot detected</Text>
          <Text style={styles.body}>
            your pack members have been notified. screenshots are allowed — but everyone knows.
          </Text>
          <View style={styles.list}>
            <Text style={styles.listItem}>• {membersCount - 1} people notified</Text>
            <Text style={styles.listItem}>• logged to your account record</Text>
            <Text style={styles.listItem}>• repeat screenshots may flag for review</Text>
          </View>
          <View style={styles.buttons}>
            <PillButton variant="dim" label="close" onPress={onClose} style={{ flex: 1, height: 38 }} />
            <PillButton variant="red" label="got it" onPress={onClose} style={{ flex: 1, height: 38 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
