import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../services/haptics';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useAppState } from '../state/AppState';

interface Plan {
  id: 'monthly' | 'yearly' | 'lifetime';
  label: string;
  price: string;
  per: string;
  badge?: string;
}

const PLANS: Plan[] = [
  { id: 'monthly', label: 'monthly', price: '$3.99', per: '/ month' },
  { id: 'yearly', label: 'yearly', price: '$29', per: '/ year', badge: 'save 39%' },
  { id: 'lifetime', label: 'lifetime', price: '$79', per: 'one-time', badge: 'best value' },
];

const BORDER_COLORS = [
  '#FFD60A', // yellow
  '#FF453A', // red
  '#30D158', // green
  '#0A84FF', // blue
  '#BF5AF2', // purple
  '#FF375F', // pink
  '#FF9F0A', // orange
];

const FEATURES = [
  { icon: 'infinite-outline', title: 'unlimited reverts', body: "change your mind any time within the 24h window — keep your streak." },
  { icon: 'archive-outline', title: 'pack vault', body: 'save unlimited packs. browse them as a private mosaic library.' },
  { icon: 'sparkles-outline', title: 'pro filters', body: 'access 4 exclusive film LUTs: bonboa, daisy, earth, hibiscus.' },
  { icon: 'color-palette-outline', title: 'pro tile borders', body: 'customize your tile border color so your friends always spot you in a pack.' },
  { icon: 'people-outline', title: '+2 invite slots', body: 'invite more friends. expand your flash. circle.' },
  { icon: 'flame-outline', title: 'streak insurance', body: 'one free streak save per month — no questions asked.' },
  { icon: 'eye-off-outline', title: 'silent mode', body: 'hide your last seen and your city resolution to country only.' },
];

export default function ProScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, updateProBorder } = useAppState();
  const [selected, setSelected] = useState<Plan['id']>('yearly');

  const onSubscribe = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'thanks for the support 🟡',
      'in-app purchases will be available in the next build. your interest is logged.',
      [{ text: 'ok', onPress: () => nav.goBack() }],
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>flash. pro</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name="flash" size={14} color="#000" />
            <Text style={styles.heroBadgeText}>pro</Text>
          </View>
          <Text style={styles.heroTitle}>flash{'\n'}without limits.</Text>
          <Text style={styles.heroSub}>
            unlock pro filters, the pack vault, and more invites. one app. one tap. zero noise.
          </Text>
        </View>

        {/* Status */}
        {user?.isPro ? (
          <View style={[styles.statusCard, { borderColor: colors.green }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.green} />
            <Text style={[styles.statusText, { color: colors.green }]}>you're pro. thank you.</Text>
          </View>
        ) : null}

        {/* Pro tile border customization */}
        {user?.isPro && (
          <>
            <Text style={styles.sectionLabel}>pro tile border</Text>
            <View style={styles.borderCard}>
              <Text style={styles.borderLabel}>choose how your tiles look in packs</Text>
              <View style={styles.colorRow}>
                {BORDER_COLORS.map((c) => {
                  const active = (user.proBorder || colors.yellow) === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => { Haptics.selectionAsync(); updateProBorder(c); }}
                      style={[styles.colorDot, { backgroundColor: c }, active && styles.colorDotActive]}
                    >
                      {active && <Ionicons name="checkmark" size={12} color="#000" />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* Features */}
        <Text style={styles.sectionLabel}>what you get</Text>
        <View style={styles.featuresWrap}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon as any} size={14} color={colors.yellow} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureBody}>{f.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Plans */}
        <Text style={styles.sectionLabel}>choose your plan</Text>
        <View style={{ gap: 8 }}>
          {PLANS.map((p) => {
            const active = selected === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => { setSelected(p.id); Haptics.selectionAsync(); }}
                style={[styles.plan, active && styles.planActive]}
              >
                <View style={styles.radio}>
                  {active && <View style={styles.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.planLabel}>{p.label}</Text>
                    {p.badge && (
                      <View style={styles.planBadge}>
                        <Text style={styles.planBadgeText}>{p.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.planPrice}>
                    <Text style={styles.planPriceBig}>{p.price}</Text>
                    <Text style={styles.planPer}> {p.per}</Text>
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* CTA */}
        <Pressable onPress={onSubscribe} style={styles.cta} disabled={user?.isPro}>
          <Text style={styles.ctaText}>{user?.isPro ? "you're already pro" : 'start pro'}</Text>
          {!user?.isPro && <Ionicons name="arrow-forward" size={14} color="#000" />}
        </Pressable>

        <Text style={styles.fineprint}>
          cancel anytime. lifetime is one-time. you'll be charged after a 7-day free trial on yearly plans.
        </Text>
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

  hero: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    gap: 8,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.yellow,
  },
  heroBadgeText: { color: '#000', fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
  heroTitle: { color: colors.white, fontSize: 30, fontWeight: '800', letterSpacing: -1, lineHeight: 32 },
  heroSub: { color: colors.textDim, fontSize: 12, lineHeight: 18 },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(48,209,88,0.06)',
  },
  statusText: { fontSize: 12, fontWeight: '600' },

  sectionLabel: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  featuresWrap: { gap: 10 },
  feature: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  featureIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(255,214,10,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { color: colors.white, fontSize: 13, fontWeight: '700' },
  featureBody: { color: colors.textDim, fontSize: 11, lineHeight: 16 },

  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  planActive: {
    borderColor: colors.yellow,
    backgroundColor: 'rgba(255,214,10,0.05)',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.yellow },
  planLabel: { color: colors.white, fontSize: 14, fontWeight: '700' },
  planBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: colors.yellow,
  },
  planBadgeText: { color: '#000', fontSize: 9, fontWeight: '800' },
  planPrice: { marginTop: 2 },
  planPriceBig: { color: colors.white, fontSize: 14, fontWeight: '700' },
  planPer: { color: colors.textDim, fontSize: 11 },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.yellow,
    marginTop: 6,
  },
  ctaText: { color: '#000', fontSize: 15, fontWeight: '800' },
  fineprint: { color: colors.textHint, fontSize: 10, textAlign: 'center', lineHeight: 14 },

  borderCard: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  borderLabel: { color: colors.textDim, fontSize: 12 },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: colors.white,
  },
});
