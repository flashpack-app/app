import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import ScreenHeader from '../components/ScreenHeader';
import { useAppState } from '../state/AppState';

function fmt(ms: number) {
  if (ms <= 0) return '0h 0m 0s';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${m}m ${s}s`;
}

export default function PackLifecycleScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { packs, user } = useAppState();
  const packId: string | undefined = route.params?.packId;
  const pack = packId ? packs.find((p) => p.id === packId) : packs[0];

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const expiresAt = pack?.expiresAt ? new Date(pack.expiresAt).getTime() : null;
  const createdAt = pack?.createdAt ? new Date(pack.createdAt).getTime() : null;
  const totalMs = 18 * 3600 * 1000;
  const remainingMs = expiresAt ? Math.max(0, expiresAt - now) : 0;
  const elapsedMs = createdAt ? Math.min(totalMs, now - createdAt) : 0;
  const progress = expiresAt ? Math.max(0, Math.min(1, elapsedMs / totalMs)) : 0;

  return (
    <View style={styles.wrap}>
      <ScreenHeader title="pack lifecycle" />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 18 }}>
        {/* Countdown hero */}
        <View style={styles.heroCard}>
          <Ionicons name="time-outline" size={20} color={colors.red} />
          <Text style={styles.heroLabel}>{pack ? 'this pack disappears in' : 'no active pack'}</Text>
          <Text style={styles.heroTime}>{pack ? fmt(remainingMs) : '—'}</Text>
          {pack && (
            <>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.heroSub}>
                pack #{pack.number} · {pack.members.length} people · {pack.countriesCount} countries
              </Text>
            </>
          )}
        </View>

        {/* Why */}
        <Section title="why does flash. expire?">
          <Para>
            flash. is a moment, not a feed. every pack lives for{' '}
            <Bold>18 hours</Bold> — then it vanishes. forever.
          </Para>
          <Para>
            no algorithm, no archive, no anxiety. you either shoot with the
            world right now, or you miss the moment. that scarcity is what
            makes a flash actually feel like a flash.
          </Para>
        </Section>

        {/* Timeline */}
        <Section title="the 18 hour timeline">
          <Step
            icon="flash"
            color={colors.yellow}
            label="0h · the shot"
            body={`you take one photo. you can't redo it. you have ${user?.isAdmin ? 'unlimited' : user?.isPro ? '4h' : '2h'} to undo.`}
          />
          <Step
            icon="people-outline"
            color={colors.yellow}
            label="0h–2h · pack forming"
            body="3 strangers shooting near the same time get matched into your pack."
          />
          <Step
            icon="cube-outline"
            color={colors.green}
            label="2h · pack revealed"
            body="the mosaic drops. chemistry score, countries, the whole thing."
          />
          <Step
            icon="chatbubble-outline"
            color={colors.yellow}
            label="2h–10h · react & comment"
            body="one emoji, one comment per person. no threads, no replies."
          />
          <Step
            icon="time-outline"
            color={colors.red}
            label="18h · gone"
            body="the pack expires. nobody can see it again — not you, not them."
          />
        </Section>

        {/* Save pack */}
        <Section title="want to keep it?">
          <Para>
            pro members can save unlimited packs to their{' '}
            <Bold>private vault</Bold> before they expire. free members can
            screenshot — but everyone in the pack gets notified.
          </Para>
          <Pressable onPress={() => nav.navigate('Pro')} style={styles.proBtn}>
            <Ionicons name="flash" size={14} color="#000" />
            <Text style={styles.proBtnText}>unlock pack vault</Text>
          </Pressable>
        </Section>
      </ScrollView>
    </View>
  );
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
};

const Para: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.para}>{children}</Text>;
};

const Bold: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.bold}>{children}</Text>;
};

const Step: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  body: string;
}> = ({ icon, color, label, body }) => {
  const styles = useThemedStyles(makeStyles);
  return (
  <View style={styles.step}>
    <View style={[styles.stepIcon, { backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={13} color={color} />
    </View>
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={styles.stepLabel}>{label}</Text>
      <Text style={styles.stepBody}>{body}</Text>
    </View>
  </View>
  );
};

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  heroCard: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  heroLabel: { color: colors.textDim, fontSize: 11, letterSpacing: 0.5 },
  heroTime: {
    color: colors.white,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  heroSub: { color: colors.textFade, fontSize: 11, marginTop: 4 },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: { height: '100%', backgroundColor: colors.red, borderRadius: 2 },
  sectionLabel: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingLeft: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  para: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  bold: { color: colors.white, fontWeight: '700' },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepLabel: { color: colors.white, fontSize: 12, fontWeight: '700' },
  stepBody: { color: colors.textSecondary, fontSize: 11, lineHeight: 16 },
  proBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.yellow,
    height: 40,
    borderRadius: 10,
  },
  proBtnText: { color: '#000', fontSize: 13, fontWeight: '800' },
});
