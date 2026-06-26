import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

interface DocItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  desc: string;
}

const DOCS: DocItem[] = [
  { key: 'terms', label: 'Terms of Service', icon: 'document-text-outline', desc: 'rules for using flash.' },
  { key: 'privacy', label: 'Privacy Policy', icon: 'lock-closed-outline', desc: 'how we handle your data' },
  { key: 'guidelines', label: 'Community Guidelines', icon: 'people-outline', desc: 'be kind. be real. be safe.' },
  { key: 'content', label: 'Content Policy', icon: 'warning-outline', desc: 'what is and is not allowed' },
  { key: 'cookies', label: 'Cookie Policy', icon: 'cube-outline', desc: 'how we use cookies' },
  { key: 'copyright', label: 'Copyright / DMCA', icon: 'copy-outline', desc: 'intellectual property & takedowns' },
  { key: 'data', label: 'Data Processing (GDPR)', icon: 'server-outline', desc: 'your rights under EU law' },
];

export default function LegalMenuScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>legal</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sub}>legal documents and policies for flash.</Text>
        {DOCS.map((d) => (
          <Pressable key={d.key} style={styles.card} onPress={() => nav.navigate('Legal', { doc: d.key })}>
            <View style={styles.iconWrap}>
              <Ionicons name={d.icon} size={18} color={colors.yellow} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{d.label}</Text>
              <Text style={styles.desc}>{d.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.textFade} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.white, fontSize: 16, fontWeight: '700' },
  scroll: { padding: 12, gap: 8, paddingBottom: 40 },
  sub: { color: colors.textDim, fontSize: 12, marginBottom: 8, paddingHorizontal: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,214,10,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: colors.white, fontSize: 13, fontWeight: '600' },
  desc: { color: colors.textFade, fontSize: 11, marginTop: 2 },
});
