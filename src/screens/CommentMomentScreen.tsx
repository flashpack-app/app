import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from '../services/haptics';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppState } from '../state/AppState';
import Mosaic from '../components/Mosaic';
import { ModerationService } from '../services/moderation';
import { APIService } from '../services/api';

export default function CommentMomentScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const route = useRoute<any>();
  const { packs, user, comments, addComment, token } = useAppState();
  const id = route.params?.packId ?? packs[0]?.id;
  const pack = packs.find((p) => p.id === id) ?? packs[0];
  const [draft, setDraft] = useState('');
  const insets = useSafeAreaInsets();

  if (!pack) return <View style={styles.wrap} />;

  const allPosted = pack.members.every((m) => m.hasPosted);
  const packComments = comments[pack.id] ?? [];
  const userCommented = packComments.some((c) => c.userId === user?.id);
  const isLocked = !allPosted || userCommented;

  const onSend = async () => {
    if (!draft.trim()) return;
    if (!ModerationService.isTextSafe(draft)) {
      Alert.alert('this message can\'t be sent.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const text = draft.trim();
    const msg = {
      id: 'c-' + Date.now(),
      userId: user?.id ?? 'anon',
      username: user?.username ?? 'anon',
      flag: user?.flag ?? '🇹🇷',
      city: user?.city ?? 'unknown',
      text,
      sentAt: new Date().toISOString(),
    };
    addComment(pack.id, msg);
    setDraft('');
    if (token) {
      try {
        await APIService.addComment(token, pack.id, text);
      } catch {}
    }
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={{ paddingTop: insets.top }}>
        <Mosaic pack={pack} height={120} borderRadius={0} cellGap={1} showFlags={false} />
      </View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.h}>one message each</Text>
          <View style={styles.countdown}>
            <Ionicons name="time-outline" size={12} color={colors.textFade} />
            <Text style={styles.countdownText}>1h 42m</Text>
          </View>
        </View>

        {!allPosted && (
          <View style={styles.lockBanner}>
            <Ionicons name="lock-closed" size={12} color={colors.textFade} />
            <Text style={styles.lockText}>opens when all {pack.members.length} have posted</Text>
          </View>
        )}

        {packComments.map((m) => (
          <View
            key={m.id}
            style={[
              styles.commentCard,
              m.userId === user?.id && styles.youCard,
            ]}
          >
            <Text style={m.userId === user?.id ? styles.metaYou : styles.meta}>
              {m.flag} {m.city} · {Math.max(1, Math.floor((Date.now() - new Date(m.sentAt).getTime()) / 60000))} min ago
              {m.userId === user?.id && ' · you'}
            </Text>
            <Text style={styles.commentText}>{m.text}</Text>
          </View>
        ))}

        {!userCommented && allPosted && (
          <View style={styles.youCard}>
            <Text style={styles.metaYou}>{user?.flag ?? '�'} you · write once, locked forever</Text>
            <View style={styles.inputRow}>
              <TextInput
                placeholder="say something..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                multiline
                maxLength={200}
              />
              <Pressable disabled={!draft.trim()} onPress={onSend} style={[styles.sendBtn, !draft.trim() && { opacity: 0.4 }]}>
                <Ionicons name="arrow-up" size={14} color="#000" />
              </Pressable>
            </View>
          </View>
        )}

        {userCommented && (
          <View style={[styles.lockBanner, { marginTop: 8 }]}>
            <Ionicons name="lock-closed" size={12} color={colors.textFade} />
            <Text style={styles.lockText}>your comment is locked forever</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  body: { padding: 12, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h: { color: colors.white, fontSize: 13, fontWeight: '600' },
  countdown: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countdownText: { color: colors.textFade, fontSize: 10 },
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
  },
  lockText: { color: colors.textFade, fontSize: 10 },
  commentCard: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  youCard: {
    backgroundColor: 'rgba(255,214,10,0.05)',
    borderColor: 'rgba(255,214,10,0.15)',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  meta: { color: colors.textFade, fontSize: 9 },
  metaYou: { color: 'rgba(255,214,10,0.45)', fontSize: 9 },
  commentText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 17 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  input: {
    flex: 1,
    minHeight: 32,
    maxHeight: 80,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: colors.white,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    fontSize: 12,
  },
  sendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
