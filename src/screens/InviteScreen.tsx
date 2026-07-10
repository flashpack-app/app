import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Share, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from '../services/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppState } from '../state/AppState';
import { APIService } from '../services/api';
import { InviteSlot } from '../types/models';
import InviteSlotRow from '../components/InviteSlotRow';
import PillButton from '../components/PillButton';

export default function InviteScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user, token } = useAppState();
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const [slots, setSlots] = useState<InviteSlot[] | null>(null);
  const [code, setCode] = useState<string>(user?.inviteCode ?? 'FLASH·___·__');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await APIService.getInviteSlots(token);
        if (!mounted) return;
        setCode(res.code);
        setSlots(res.slots);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? 'failed to load slots');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  const onCopy = async () => {
    await Clipboard.setStringAsync(code);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Share.share({
      message: `hey! join me on flash. 📸\nhttps://flsh.pw/${code}\n\nyou'll get 3 invites to bring your own people too.`,
    });
  };

  const slotsCount = slots?.length ?? user?.inviteSlots ?? 3;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={[styles.title, { paddingTop: Math.max(14, insets.top) }]}>invites</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>your code</Text>
        <View style={styles.codeCard}>
          <Text style={styles.code}>{code}</Text>
          <Pressable onPress={onCopy} style={styles.copyBtn}>
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={16}
              color={copied ? colors.green : colors.white}
            />
          </Pressable>
        </View>
        {copied && <Text style={styles.copied}>copied!</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{slotsCount} slots</Text>
        {loading ? (
          <ActivityIndicator color={colors.yellow} style={{ paddingVertical: 18 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {(slots ?? []).map((s) => (
              <InviteSlotRow key={s.id} slot={s} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.warning}>
        <Ionicons name="warning-outline" size={14} color="rgba(255,214,10,0.6)" />
        <Text style={styles.warningText}>
          if someone you invite breaks the rules, your account is reviewed too.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 12, marginTop: 12 }}>
        <PillButton variant="yellow" label="share invite link" onPress={onShare} style={{ height: 44 }}>
          <Ionicons name="share-outline" size={14} color="#000" />
        </PillButton>
      </View>

      <Pressable onPress={() => nav.navigate('FamilyTree')} style={styles.treeLink}>
        <Ionicons name="git-branch-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.treeLinkText}>see your flash family tree</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  title: { color: colors.white, fontSize: 14, fontWeight: '700', padding: 14 },
  section: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  sectionLabel: { color: colors.textDim, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
  code: { color: colors.white, fontWeight: '700', fontSize: 15, letterSpacing: 2 },
  copyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copied: { color: colors.green, fontSize: 10 },
  error: { color: colors.red, fontSize: 11, padding: 12 },
  warning: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 12,
    marginTop: 8,
  },
  warningText: { color: colors.textFade, fontSize: 11, flex: 1, lineHeight: 16 },
  treeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  treeLinkText: { color: colors.textSecondary, fontSize: 11, flex: 1 },
});
