import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useAppState } from '../state/AppState';
import PackCard from '../components/PackCard';

export default function PackVaultScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { packs, reactions, user } = useAppState();
  const isPro = user?.isPro ?? false;

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>pack vault</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {packs.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={40} color={colors.textFade} />
            <Text style={styles.emptyTitle}>no packs yet</Text>
            <Text style={styles.emptySub}>your packs will appear here after you flash.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={styles.count}>{packs.length} pack{packs.length === 1 ? '' : 's'}</Text>
            {packs.map((p) => (
              <View key={p.id}>
                <PackCard
                  pack={p}
                  reactions={reactions[p.id] ?? []}
                  onPress={() => nav.navigate('PackReveal', { packId: p.id })}
                />
                {!isPro && (
                  <View style={styles.blurOverlay}>
                    <View style={styles.lockContent}>
                      <Ionicons name="lock-closed" size={28} color={colors.yellow} />
                      <Text style={styles.lockTitle}>pack vault is pro</Text>
                      <Text style={styles.lockSub}>upgrade to flash. pro to unlock your pack vault.</Text>
                      <Pressable
                        onPress={() => nav.navigate('Pro')}
                        style={({ pressed }) => [
                          styles.upgradeBtn,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Ionicons name="flash" size={14} color="#000" />
                        <Text style={styles.upgradeText}>upgrade to pro</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
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
  scroll: { padding: 12, paddingBottom: 40 },
  empty: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { color: colors.white, fontSize: 14, fontWeight: '600' },
  emptySub: { color: colors.textFade, fontSize: 12, textAlign: 'center' },
  count: { color: colors.textDim, fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  lockContent: { alignItems: 'center', gap: 8, padding: 20 },
  lockTitle: { color: colors.white, fontSize: 14, fontWeight: '700' },
  lockSub: { color: colors.textFade, fontSize: 11, textAlign: 'center', maxWidth: 220 },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.yellow,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 4,
  },
  upgradeText: { color: '#000', fontSize: 12, fontWeight: '700' },
});
