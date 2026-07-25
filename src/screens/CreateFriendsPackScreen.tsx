import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PackMember } from '../types/models';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppState } from '../state/AppState';
import { APIService } from '../services/api';
import { posthog } from '../config/posthog';

function normalizeCode(value: string): string {
  const stripped = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!stripped.startsWith('FLASH')) return value.trim().toUpperCase();
  const rest = stripped.slice(5);
  return `FLASH-${rest.slice(0, 3)}-${rest.slice(3, 5)}`;
}

export default function CreateFriendsPackScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { packs, user, token, addPack } = useAppState();
  const [size, setSize] = useState<2 | 4 | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteCodes, setInviteCodes] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [creating, setCreating] = useState(false);

  const candidates = useMemo(() => {
    const people = new Map<string, PackMember>();
    for (const pack of packs) {
      for (const member of pack.members) {
        if (member.userId !== user?.id) people.set(member.userId, member);
      }
    }
    const search = query.trim().toLowerCase();
    return [...people.values()]
      .filter((member) => !search || member.username.toLowerCase().includes(search))
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [packs, query, user?.id]);

  const inviteeLimit = size ? size - 1 : 0;
  const selectedCount = selectedIds.length + inviteCodes.length;
  const rosterComplete = !!size && selectedCount === inviteeLimit;

  const toggleMember = (userId: string) => {
    setSelectedIds((current) => {
      if (current.includes(userId)) return current.filter((id) => id !== userId);
      if (current.length + inviteCodes.length >= inviteeLimit) return current;
      return [...current, userId];
    });
  };

  const addInviteCode = () => {
    if (!codeInput.trim() || selectedCount >= inviteeLimit) return;
    const normalized = normalizeCode(codeInput);
    if (!/^FLASH-[A-Z0-9]{3}-[A-Z0-9]{2}$/.test(normalized)) {
      Alert.alert('check that code', 'invite codes look like FLASH-ABC-12.');
      return;
    }
    if (inviteCodes.includes(normalized) || normalized === user?.inviteCode?.replace(/·/g, '-')) {
      Alert.alert('already added', 'choose a different friend.');
      return;
    }
    setInviteCodes((current) => [...current, normalized]);
    setCodeInput('');
  };

  const createPack = async () => {
    if (!token || !size || !rosterComplete || creating) return;
    setCreating(true);
    try {
      const pack = await APIService.createFriendsPack(token, {
        size,
        invitedUserIds: selectedIds,
        inviteCodes,
      });
      addPack(pack);
      posthog.capture('friends_pack_created', {
        size,
        picked_members: selectedIds.length,
        invite_codes: inviteCodes.length,
      });
      nav.replace('FriendsFeed');
    } catch (error: any) {
      const code = error?.body?.error;
      const message =
        code === 'invite_code_not_found'
          ? 'one of those invite codes does not belong to an existing flash. account.'
          : code === 'friend_not_previously_packed'
            ? 'choose people you have already packed with, or use their invite code.'
            : 'we could not create this private pack. please try again.';
      Alert.alert('friends.flash not created', message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>friends<Text style={styles.yellow}>.</Text>flash</Text>
          <Text style={styles.subtitle}>private · invite-only · 18 hours</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      {!size ? (
        <View style={styles.sizeStep}>
          <View style={styles.lockCircle}>
            <Ionicons name="lock-closed" size={25} color="#000" />
          </View>
          <Text style={styles.stepTitle}>who is in this moment?</Text>
          <Text style={styles.stepBody}>you are included. pick the total pack size.</Text>
          <View style={styles.sizeRow}>
            {([2, 4] as const).map((option) => (
              <Pressable key={option} onPress={() => setSize(option)} style={styles.sizeCard}>
                <View style={styles.peoplePreview}>
                  {Array.from({ length: option }).map((_, index) => (
                    <View key={index} style={styles.personDot} />
                  ))}
                </View>
                <Text style={styles.sizeNumber}>{option}</Text>
                <Text style={styles.sizeLabel}>people</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>invite {inviteeLimit} {inviteeLimit === 1 ? 'friend' : 'friends'}</Text>
              <Text style={styles.progressCount}>{selectedCount}/{inviteeLimit}</Text>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={17} color={colors.textDim} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="search people you've packed with"
                placeholderTextColor={colors.textFade}
                style={styles.search}
                autoCapitalize="none"
              />
            </View>

            {candidates.length ? (
              <View style={styles.peopleCard}>
                {candidates.map((member, index) => {
                  const selected = selectedIds.includes(member.userId);
                  const disabled = !selected && selectedCount >= inviteeLimit;
                  return (
                    <React.Fragment key={member.userId}>
                      {index > 0 ? <View style={styles.divider} /> : null}
                      <Pressable
                        onPress={() => toggleMember(member.userId)}
                        disabled={disabled}
                        style={[styles.personRow, disabled && styles.disabled]}
                      >
                        {member.avatarUrl ? (
                          <Image source={{ uri: member.avatarUrl }} style={styles.avatar} />
                        ) : (
                          <View style={[styles.avatar, styles.avatarFallback]}>
                            <Text style={styles.avatarText}>{member.initials}</Text>
                          </View>
                        )}
                        <View style={styles.personCopy}>
                          <Text style={styles.username}>@{member.username}</Text>
                          <Text style={styles.location}>{member.flag} {member.city}</Text>
                        </View>
                        <View style={[styles.check, selected && styles.checkSelected]}>
                          {selected ? <Ionicons name="checkmark" size={14} color="#000" /> : null}
                        </View>
                      </Pressable>
                    </React.Fragment>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyPeople}>no matching past pack members yet.</Text>
            )}

            <Text style={styles.or}>or add an existing user's invite code</Text>
            <View style={styles.codeRow}>
              <TextInput
                value={codeInput}
                onChangeText={setCodeInput}
                onSubmitEditing={addInviteCode}
                placeholder="FLASH-ABC-12"
                placeholderTextColor={colors.textFade}
                autoCapitalize="characters"
                style={styles.codeInput}
                editable={selectedCount < inviteeLimit}
              />
              <Pressable onPress={addInviteCode} style={styles.addCodeButton}>
                <Ionicons name="add" size={20} color="#000" />
              </Pressable>
            </View>
            {inviteCodes.map((code) => (
              <Pressable
                key={code}
                onPress={() => setInviteCodes((current) => current.filter((item) => item !== code))}
                style={styles.codeChip}
              >
                <Ionicons name="ticket-outline" size={13} color={colors.yellow} />
                <Text style={styles.codeChipText}>{code}</Text>
                <Ionicons name="close" size={13} color={colors.textDim} />
              </Pressable>
            ))}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <Pressable onPress={() => { setSize(null); setSelectedIds([]); setInviteCodes([]); }} style={styles.changeSize}>
              <Text style={styles.changeSizeText}>change size</Text>
            </Pressable>
            <Pressable
              onPress={createPack}
              disabled={!rosterComplete || creating}
              style={[styles.createButton, (!rosterComplete || creating) && styles.createDisabled]}
            >
              {creating ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="flash" size={17} color="#000" />
                  <Text style={styles.createText}>create private pack</Text>
                </>
              )}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  header: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, alignItems: 'center' },
  title: { color: colors.white, fontSize: 20, fontWeight: '900' },
  yellow: { color: colors.yellow },
  subtitle: { marginTop: 2, color: colors.textDim, fontSize: 10 },
  sizeStep: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  lockCircle: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.yellow,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  stepTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
  stepBody: { color: colors.textDim, fontSize: 12, marginTop: 7, textAlign: 'center' },
  sizeRow: { flexDirection: 'row', gap: 12, marginTop: 26 },
  sizeCard: {
    width: 130, paddingVertical: 22, alignItems: 'center', borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSofter,
  },
  peoplePreview: { height: 26, flexDirection: 'row', alignItems: 'center', gap: 4 },
  personDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.yellow },
  sizeNumber: { color: colors.white, fontSize: 30, fontWeight: '900', marginTop: 8 },
  sizeLabel: { color: colors.textDim, fontSize: 11 },
  content: { padding: 16, paddingBottom: 130 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressText: { color: colors.white, fontSize: 18, fontWeight: '800' },
  progressCount: { color: colors.yellow, fontSize: 13, fontWeight: '800' },
  searchWrap: {
    height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12,
    borderRadius: 12, backgroundColor: colors.surfaceSofter, borderWidth: 1, borderColor: colors.border,
  },
  search: { flex: 1, color: colors.white, fontSize: 13 },
  peopleCard: {
    marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceSofter, overflow: 'hidden',
  },
  personRow: { minHeight: 64, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  disabled: { opacity: 0.4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 64 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#000', fontSize: 12, fontWeight: '800' },
  personCopy: { flex: 1 },
  username: { color: colors.white, fontSize: 14, fontWeight: '700' },
  location: { color: colors.textDim, fontSize: 10, marginTop: 3 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  checkSelected: { borderColor: colors.yellow, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  emptyPeople: { color: colors.textDim, textAlign: 'center', marginVertical: 24, fontSize: 12 },
  or: { color: colors.textDim, fontSize: 10, textAlign: 'center', marginVertical: 16 },
  codeRow: { flexDirection: 'row', gap: 8 },
  codeInput: {
    flex: 1, height: 44, borderRadius: 12, paddingHorizontal: 13, color: colors.white,
    backgroundColor: colors.surfaceSofter, borderWidth: 1, borderColor: colors.border,
    fontSize: 13, fontWeight: '700', letterSpacing: 0.5,
  },
  addCodeButton: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: colors.yellow,
    alignItems: 'center', justifyContent: 'center',
  },
  codeChip: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 9, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999,
    backgroundColor: 'rgba(255,214,10,0.10)', borderWidth: 1, borderColor: 'rgba(255,214,10,0.3)',
  },
  codeChipText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12,
    flexDirection: 'row', gap: 10, backgroundColor: colors.black,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  changeSize: {
    height: 48, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  changeSizeText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  createButton: {
    flex: 1, height: 48, borderRadius: 12, backgroundColor: colors.yellow,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  createDisabled: { opacity: 0.35 },
  createText: { color: '#000', fontSize: 13, fontWeight: '800' },
});
