import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import ProGate from '../components/ProGate';
import { useAppState } from '../state/AppState';
import PackCard from '../components/PackCard';

export default function PackVaultScreen() {
  const nav = useNavigation<any>();
  const { packs, reactions, user } = useAppState();
  const isPro = user?.isPro ?? false;

  return (
    <View style={styles.wrap}>
      <ScreenHeader title="pack vault" />
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
                  <ProGate
                    title="pack vault is pro"
                    subtitle="upgrade to flash. pro to unlock your pack vault."
                    borderRadius={12}
                  />
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
  scroll: { padding: 12, paddingBottom: 40 },
  empty: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { color: colors.white, fontSize: 14, fontWeight: '600' },
  emptySub: { color: colors.textFade, fontSize: 12, textAlign: 'center' },
  count: { color: colors.textDim, fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },

});
