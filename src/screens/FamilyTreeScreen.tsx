import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppState } from '../state/AppState';
import { APIService, Lineage, LineageNode } from '../services/api';
import { t } from '../services/i18n';

function initialsOf(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

function NodeRow({
  node,
  isSelf,
  indent,
  onPress,
}: {
  node: LineageNode;
  isSelf?: boolean;
  indent?: number;
  onPress?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={isSelf || !onPress}
      style={[styles.row, isSelf && styles.rowSelf, { marginLeft: (indent ?? 0) * 18 }]}
    >
      {node.avatarUrl ? (
        <Image source={{ uri: node.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarText}>{initialsOf(node.username)}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.username}>
          @{node.username}
          {isSelf ? t('family_tree_you') : ''}
        </Text>
        <Text style={styles.meta}>
          {node.flag} {node.city} · {t('family_tree_joined_date', { date: new Date(node.joinedAt).toLocaleDateString() })}
        </Text>
      </View>
      {node.isPro && <Text style={styles.pro}>pro</Text>}
    </Pressable>
  );
}

export default function FamilyTreeScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { token } = useAppState();

  const [lineage, setLineage] = useState<Lineage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    APIService.getLineage(token)
      .then(setLineage)
      .catch(() => setError(t('family_tree_error')));
  }, [token]);

  // Flatten the descendant tree depth-first so children render under their
  // inviter, indented one level deeper.
  const descendantRows = useMemo(() => {
    if (!lineage) return [];
    const byParent = new Map<string, LineageNode[]>();
    for (const n of lineage.descendants) {
      const list = byParent.get(n.invitedBy ?? '') ?? [];
      list.push(n);
      byParent.set(n.invitedBy ?? '', list);
    }
    const rows: Array<{ node: LineageNode; indent: number }> = [];
    const walk = (parentId: string, indent: number) => {
      for (const child of byParent.get(parentId) ?? []) {
        rows.push({ node: child, indent });
        walk(child.id, indent + 1);
      }
    };
    walk(lineage.self.id, 0);
    return rows;
  }, [lineage]);

  const openProfile = (username: string) => nav.push('PublicProfile', { username });

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[styles.header, { paddingTop: Math.max(14, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>{t('family_tree_title')}</Text>
      </View>

      {!lineage && !error && <ActivityIndicator color={colors.yellow} style={{ paddingVertical: 24 }} />}
      {error && <Text style={styles.error}>{error}</Text>}

      {lineage && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('family_tree_lineage')}</Text>
            {lineage.ancestors.length === 0 && (
              <Text style={styles.empty}>{t('family_tree_founding_member')}</Text>
            )}
            {lineage.ancestors.map((a) => (
              <View key={a.id}>
                <NodeRow node={a} onPress={() => openProfile(a.username)} />
                <View style={styles.connector} />
              </View>
            ))}
            <NodeRow node={lineage.self} isSelf />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('family_tree_invited_by_you')}</Text>
            {descendantRows.length === 0 && (
              <Text style={styles.empty}>{t('family_tree_empty_descendants')}</Text>
            )}
            {descendantRows.map(({ node, indent }) => (
              <NodeRow key={node.id} node={node} indent={indent} onPress={() => openProfile(node.username)} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingBottom: 6 },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.white, fontSize: 14, fontWeight: '700' },
  section: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  sectionLabel: { color: colors.textDim, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
  },
  rowSelf: { borderColor: colors.yellow, borderWidth: 1 },
  connector: { width: 1, height: 10, backgroundColor: colors.border, marginLeft: 26 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  username: { color: colors.white, fontSize: 12, fontWeight: '600' },
  meta: { color: colors.textDim, fontSize: 10, marginTop: 2 },
  pro: { color: colors.yellow, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  empty: { color: colors.textFade, fontSize: 11, paddingVertical: 6 },
  error: { color: colors.red, fontSize: 11, padding: 14 },
});
