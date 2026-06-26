import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { InviteSlot } from '../types/models';

const InviteSlotRow: React.FC<{ slot: InviteSlot }> = ({ slot }) => {
  if (slot.status === 'joined') {
    return (
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: '#1a2a1a' }]}>
          <Ionicons name="person" size={14} color={colors.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{slot.invitedUsername}</Text>
          <Text style={styles.sub}>joined flash.</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: 'rgba(48,209,88,0.15)' }]}>
          <Text style={[styles.badgeText, { color: colors.green }]}>joined</Text>
        </View>
      </View>
    );
  }

  if (slot.status === 'pending') {
    return (
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: 'rgba(255,214,10,0.12)' }]}>
          <Ionicons name="person" size={14} color={colors.yellow} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{slot.invitedUsername}</Text>
          <Text style={styles.sub}>sent · not joined yet</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: 'rgba(255,214,10,0.15)' }]}>
          <Text style={[styles.badgeText, { color: colors.yellow }]}>pending</Text>
        </View>
      </View>
    );
  }

  // open
  return (
    <View style={styles.row}>
      <View style={[styles.icon, styles.iconDashed]}>
        <Text style={{ color: colors.yellow, fontSize: 14, fontWeight: '700' }}>+</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>1 slot remaining</Text>
        <Text style={styles.sub}>earn more at 30-day streak</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDashed: {
    borderWidth: 1,
    borderColor: colors.yellow,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  name: { color: colors.white, fontSize: 12, fontWeight: '600' },
  sub: { color: colors.textDim, fontSize: 10, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '700' },
});

export default InviteSlotRow;
