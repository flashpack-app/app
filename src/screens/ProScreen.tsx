import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../services/haptics';
import { useNavigation } from '@react-navigation/native';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import ScreenHeader from '../components/ScreenHeader';
import { useAppState } from '../state/AppState';
import { markOnboardingComplete } from '../services/onboardingStore';
import { posthog } from '../config/posthog';
import { t } from '../services/i18n';

interface Plan {
  id: 'monthly' | 'yearly' | 'lifetime';
  label: string;
  price: string;
  per: string;
  badge?: string;
}

function getPlans(): Plan[] {
  return [
    { id: 'monthly', label: t('pro_plan_monthly'), price: '$3.99', per: t('pro_plan_perMonth') },
    { id: 'yearly', label: t('pro_plan_yearly'), price: '$29', per: t('pro_plan_perYear'), badge: t('pro_plan_badgeSave') },
    { id: 'lifetime', label: t('pro_plan_lifetime'), price: '$79', per: t('pro_plan_perLifetime'), badge: t('pro_plan_badgeBest') },
  ];
}

const BORDER_COLORS = [
  '#FFD60A', // yellow
  '#FF453A', // red
  '#30D158', // green
  '#0A84FF', // blue
  '#BF5AF2', // purple
  '#FF375F', // pink
  '#FF9F0A', // orange
];

function getFeatures() {
  return [
    { icon: 'videocam-outline', title: t('pro_feat_live_title'), body: t('pro_feat_live_body') },
    { icon: 'infinite-outline', title: t('pro_feat_reverts_title'), body: t('pro_feat_reverts_body') },
    { icon: 'archive-outline', title: t('pro_feat_vault_title'), body: t('pro_feat_vault_body') },
    { icon: 'sparkles-outline', title: t('pro_feat_filters_title'), body: t('pro_feat_filters_body') },
    { icon: 'color-palette-outline', title: t('pro_feat_borders_title'), body: t('pro_feat_borders_body') },
    { icon: 'people-outline', title: t('pro_feat_invites_title'), body: t('pro_feat_invites_body') },
    { icon: 'flame-outline', title: t('pro_feat_streak_title'), body: t('pro_feat_streak_body') },
    { icon: 'eye-off-outline', title: t('pro_feat_silent_title'), body: t('pro_feat_silent_body') },
  ];
}

export default function ProScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const { user, updateProBorder, isOnboarding, setIsOnboarding } = useAppState();
  const [selected, setSelected] = useState<Plan['id']>('yearly');
  const PLANS = getPlans();
  const FEATURES = getFeatures();
  const isPro = !!user?.isPro;

  const onClose = async () => {
    if (isOnboarding) {
      await markOnboardingComplete();
      setIsOnboarding(false);
    } else {
      nav.goBack();
    }
  };

  const onSubscribe = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    posthog.capture('pro_subscribe_tapped', { plan: selected });
    Alert.alert(
      t('pro_subscribeThanks'),
      t('pro_subscribeNote'),
      [{ text: t('pro_subscribeOk'), onPress: onClose }],
    );
  };

  const openPlatformSubscriptions = async () => {
    const url = Platform.select({
      ios: 'itms-apps://apps.apple.com/account/subscriptions',
      android: 'https://play.google.com/store/account/subscriptions',
    });
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      Linking.openURL(url);
    } else {
      Alert.alert(t('pro_unableToOpen'), t('pro_unableToOpenSub'));
    }
  };

  const onManageSubscription = () => {
    Haptics.selectionAsync();
    Alert.alert(
      t('pro_cancelTitle'),
      t('pro_cancelSub'),
      [
        { text: t('pro_keepPro'), style: 'cancel' },
        { text: t('pro_continueToCancelPro'), style: 'destructive', onPress: openPlatformSubscriptions },
      ],
    );
  };

  return (
    <View style={styles.wrap}>
      <ScreenHeader
        title={t('flashPro')}
        onBack={onClose}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name="flash" size={14} color="#000" />
            <Text style={styles.heroBadgeText}>{t('pro_badge')}</Text>
          </View>
          <Text style={styles.heroTitle}>{t('pro_heroTitle')}</Text>
          <Text style={styles.heroSub}>{t('pro_heroSub')}</Text>
        </View>

        {/* Status */}
        {isPro ? (
          <View style={[styles.statusCard, { borderColor: colors.green }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.green} />
            <Text style={[styles.statusText, { color: colors.green }]}>{t('pro_youArePro')}</Text>
          </View>
        ) : null}

        {/* Pro tile border customization */}
        {isPro && (
          <>
            <Text style={styles.sectionLabel}>{t('pro_tileBorderSection')}</Text>
            <View style={styles.borderCard}>
              <Text style={styles.borderLabel}>{t('pro_tileBorderLabel')}</Text>
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
        <Text style={styles.sectionLabel}>{t('pro_whatYouGet')}</Text>
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

        {/* Plans — only relevant if they're not already subscribed */}
        {!isPro && (
          <>
            <Text style={styles.sectionLabel}>{t('pro_choosePlan')}</Text>
            <View style={{ gap: 8 }}>
              {PLANS.map((p) => {
                const active = selected === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => { setSelected(p.id); Haptics.selectionAsync(); posthog.capture('pro_plan_selected', { plan: p.id, price: p.price }); }}
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

            <Pressable onPress={onSubscribe} style={styles.cta}>
              <Text style={styles.ctaText}>{t('pro_startPro')}</Text>
              <Ionicons name="arrow-forward" size={14} color="#000" />
            </Pressable>

            <Text style={styles.fineprint}>{t('pro_fineprint')}</Text>
          </>
        )}

        {/* Manage / cancel subscription */}
        {isPro && (
          <View style={styles.manageCard}>
            <Text style={styles.sectionLabel}>{t('pro_manageSubscription')}</Text>
            <Pressable onPress={onManageSubscription} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>{t('pro_cancelSubscription')}</Text>
            </Pressable>
            <Text style={styles.manageHint}>
              {Platform.OS === 'ios' ? t('pro_manageHintIos') : t('pro_manageHintAndroid')}
            </Text>
          </View>
        )}

        {isOnboarding && (
          <Pressable onPress={onClose} style={styles.skipLink}>
            <Text style={styles.skipLinkText}>{t('pro_maybeLater')}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },

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

  manageCard: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  cancelBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,69,58,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: '#FF453A', fontSize: 13, fontWeight: '700' },
  manageHint: { color: colors.textHint, fontSize: 10, textAlign: 'center' },

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
  skipLink: {
    marginTop: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  skipLinkText: {
    color: 'rgba(255,255,255,0.22)',
    fontSize: 11,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

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