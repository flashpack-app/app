import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import ScreenHeader from '../components/ScreenHeader';
import ProGate from '../components/ProGate';
import { useAppState } from '../state/AppState';
import PackCard from '../components/PackCard';
import { t } from '../services/i18n';

export default function PackVaultScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const { packs, reactions, user } = useAppState();
  const isPro = user?.isPro ?? false;

  return (
    <View style={styles.wrap}>
      <ScreenHeader title={t('vault_title')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {packs.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={40} color={colors.textFade} />
            <Text style={styles.emptyTitle}>{t('vault_empty_title')}</Text>
            <Text style={styles.emptySub}>{t('vault_empty_sub')}</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={styles.count}>
              {packs.length === 1 ? t('vault_count_one', { count: 1 }) : t('vault_count_other', { count: packs.length })}
            </Text>
            {packs.map((p) => (
              <View key={p.id}>
                <PackCard
                  pack={p}
                  reactions={reactions[p.id] ?? []}
                  onPress={() => nav.navigate('PackReveal', { packId: p.id })}
                />
                {!isPro && (
                  <ProGate
                    title={t('vault_pro_gate_title')}
                    subtitle={t('vault_pro_gate_sub')}
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

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  scroll: { padding: 12, paddingBottom: 40 },
  empty: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { color: colors.white, fontSize: 14, fontWeight: '600' },
  emptySub: { color: colors.textFade, fontSize: 12, textAlign: 'center' },
  count: { color: colors.textDim, fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },

});
