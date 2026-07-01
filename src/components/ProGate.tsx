import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';

interface ProGateProps {
  title: string;
  subtitle: string;
  borderRadius?: number;
}

const ProGate: React.FC<ProGateProps> = ({ title, subtitle, borderRadius }) => {
  const nav = useNavigation<any>();

  return (
    <View style={[styles.overlay, borderRadius != null && { borderRadius }]}>
      <View style={styles.content}>
        <Ionicons name="lock-closed" size={28} color={colors.yellow} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{subtitle}</Text>
        <Pressable
          onPress={() => nav.navigate('Pro')}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="flash" size={14} color="#000" />
          <Text style={styles.btnText}>upgrade to pro</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { alignItems: 'center', gap: 8, padding: 20 },
  title: { color: colors.white, fontSize: 14, fontWeight: '700' },
  sub: { color: colors.textFade, fontSize: 11, textAlign: 'center', maxWidth: 220 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.yellow,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 4,
  },
  btnText: { color: '#000', fontSize: 12, fontWeight: '700' },
});

export default ProGate;
