import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from '../services/haptics';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import ScaledText from './ScaledText';

interface Props {
  visible: boolean;
  imageUri: string | null;
  packNumber: number;
  onClose: () => void;
}

const { height: SCREEN_H } = Dimensions.get('window');

function normalizeUri(uri: string | null): string | null {
  if (!uri) return null;
  if (uri.startsWith('file://') || uri.startsWith('http')) return uri;
  return `file://${uri}`;
}

const ShareSheet: React.FC<Props> = ({ visible, imageUri, packNumber, onClose }) => {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const normalizedUri = useMemo(() => normalizeUri(imageUri), [imageUri]);

  useEffect(() => {
    if (!copied) return undefined;
    const timeout = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [copied]);

  const shareImage = async () => {
    if (!normalizedUri) return;
    await Sharing.shareAsync(normalizedUri, {
      mimeType: 'image/png',
      dialogTitle: 'share to story',
    });
  };

  const onInstagramStories = async () => {
    if (!normalizedUri) return;
    try {
      const canOpen = await Linking.canOpenURL('instagram-stories://share');
      if (!canOpen) {
        // We do not have the native Instagram story asset bridge here, so fall back
        // to the system share sheet which can still target Instagram.
        await shareImage();
        return;
      }
      await Linking.openURL('instagram-stories://share');
    } catch {
      try {
        await shareImage();
      } catch {
        Alert.alert('share failed', 'could not open a sharing destination.');
      }
    }
  };

  const onCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(`flash://pack/${packNumber}`);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCopied(true);
    } catch {
      Alert.alert('copy failed', 'could not copy the link.');
    }
  };

  const onMore = async () => {
    if (!normalizedUri) return;
    try {
      await shareImage();
    } catch {
      Alert.alert('share failed', 'could not open the share sheet.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom + 10) }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <ScaledText style={styles.title}>share your pack</ScaledText>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.previewWrap}>
            <View style={styles.previewCard}>
              {normalizedUri ? (
                <Image source={{ uri: normalizedUri }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <View style={styles.previewLoader}>
                  <ActivityIndicator color={colors.yellow} />
                </View>
              )}
            </View>
          </View>

          <View style={styles.destRow}>
            <ShareAction
              icon="logo-instagram"
              label="instagram stories"
              accent={colors.yellow}
              onPress={onInstagramStories}
              disabled={!normalizedUri}
            />
            <ShareAction
              icon="link-outline"
              label={copied ? 'copied' : 'copy link'}
              accent={colors.white}
              onPress={onCopyLink}
            />
            <ShareAction
              icon="ellipsis-horizontal"
              label="more"
              accent={colors.white}
              onPress={onMore}
              disabled={!normalizedUri}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

function ShareAction({
  icon,
  label,
  accent,
  onPress,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accent: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.action, pressed && !disabled && styles.actionPressed, disabled && styles.actionDisabled]}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>
      <ScaledText style={disabled ? [styles.actionLabel, styles.actionLabelDisabled] : styles.actionLabel}>
        {label}
      </ScaledText>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: '#121212',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderTopWidth: 1,
      borderColor: '#222',
      paddingTop: 8,
      paddingHorizontal: 18,
      gap: 18,
    },
    handle: {
      alignSelf: 'center',
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    closeBtn: {
      padding: 4,
    },
    previewWrap: {
      alignItems: 'center',
    },
    previewCard: {
      width: '100%',
      aspectRatio: 9 / 16,
      maxHeight: SCREEN_H * 0.38,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#2b2b2b',
      backgroundColor: '#0d0d0d',
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    previewLoader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    destRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: 2,
    },
    action: {
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    actionPressed: {
      opacity: 0.7,
    },
    actionDisabled: {
      opacity: 0.35,
    },
    actionIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surfaceSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      textAlign: 'center',
      lineHeight: 14,
    },
    actionLabelDisabled: {
      color: colors.textFade,
    },
  });

export default ShareSheet;
