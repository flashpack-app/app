import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pack, PackPhoto, PackMember } from '../types/models';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { radius } from '../theme/colors';
import { normalizeFilter } from '../services/filters';
import FilteredImage from './FilteredImage';

interface Props {
  pack: Pack;
  height?: number;
  cellRadius?: number;
  borderRadius?: number;
  showFlags?: boolean;
  highlightSelf?: boolean;
  selfUserId?: string;
  animateOnMount?: boolean;
  cellGap?: number;
  style?: ViewStyle;
  onCellPress?: (photoId: string) => void;
}

interface CellProps {
  photo: PackPhoto;
  member?: PackMember;
  expired: boolean;
  showFlag: boolean;
  isSelf: boolean;
  index: number;
  animate: boolean;
  onPress?: () => void;
}

const Cell: React.FC<CellProps> = ({ photo, member, expired, showFlag, isSelf, index, animate, onPress }) => {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const isPro = member?.isPro;
  const proBorderColor = member?.proBorder || colors.yellow;
  const scale = useSharedValue(animate ? 0.85 : 1);
  const opacity = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    scale.value = withDelay(index * 80, withSpring(1, { damping: 14, stiffness: 140 }));
    opacity.value = withDelay(index * 80, withSpring(1, { damping: 14, stiffness: 140 }));
  }, [animate]);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const [videoReady, setVideoReady] = useState(false);

  // flash.live silent looping video player
  const videoPlayer = useVideoPlayer(photo.videoURL ?? null, (player) => {
    if (photo.videoURL) {
      player.loop = true;
      player.muted = true;
    }
  });

  // For network URLs, play() before load is ignored by AVPlayer.
  // We listen for readyToPlay and start then.
  useEffect(() => {
    if (!photo.videoURL) return;
    const sub = videoPlayer.addListener('statusChange', ({ status }: any) => {
      if (status === 'readyToPlay') {
        videoPlayer.loop = true;
        videoPlayer.play();
        setVideoReady(true);
      }
    });
    return () => sub.remove();
  }, [videoPlayer]);

  const [c1, c2] = photo.placeholder ?? ['#222', '#111'];

  return (
    <Animated.View style={[
      styles.cell,
      isSelf && styles.selfCell,
      isPro && !isSelf && { borderWidth: 1.5, borderColor: proBorderColor },
      aStyle,
    ]}>
    <Pressable onPress={onPress} disabled={!onPress} style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c1 }]} />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: c2, opacity: 0.5 },
        ]}
      />
      {photo.videoURL ? (
        <>
          <VideoView
            player={videoPlayer}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            nativeControls={false}
            surfaceType="textureView"
          />
          {!videoReady && (
            <View style={[StyleSheet.absoluteFill, styles.loader]} pointerEvents="none">
              <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
            </View>
          )}
        </>
      ) : photo.imageURL ? (
        <FilteredImage
          source={{ uri: photo.imageURL }}
          filter={normalizeFilter(photo.filter)}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          showLoader
        />
      ) : null}
      {photo.videoURL && (
        <View style={styles.liveBadge}>
          <Ionicons name="flash" size={7} color="#000" />
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
      )}
      {expired && (
        <View style={styles.expiredOverlay}>
          <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.6)" />
        </View>
      )}
      {showFlag && member && (
        <Text style={styles.flag}>{member.flag}</Text>
      )}
      {isSelf && (
        <View style={styles.youBadge}>
          <Text style={styles.youBadgeText}>you</Text>
        </View>
      )}
      {isPro && !isSelf && (
        <View style={[styles.proBadge, { backgroundColor: proBorderColor }]}>
          <Ionicons name="flash" size={8} color="#000" />
        </View>
      )}
    </Pressable>
    </Animated.View>
  );
};

const Mosaic: React.FC<Props> = ({
  pack,
  height = 220,
  borderRadius = 14,
  showFlags = true,
  highlightSelf = true,
  selfUserId = 'u-self',
  animateOnMount = false,
  cellGap = 3,
  style,
  onCellPress,
}) => {
  const styles = useThemedStyles(makeStyles);
  const photos = pack.photos.slice(0, 4);
  const memberOf = (uid: string) => pack.members.find((m) => m.userId === uid);
  const expired = pack.status === 'expired';

  return (
    <View style={[styles.wrap, { height, borderRadius }, style]}>
      <View style={[styles.grid, { gap: cellGap }]}>
        {photos.map((p, i) => (
          <Cell
            key={p.id}
            photo={p}
            member={memberOf(p.userId)}
            expired={expired}
            showFlag={showFlags}
            isSelf={highlightSelf && p.userId === selfUserId}
            index={i}
            animate={animateOnMount}
            onPress={onCellPress ? () => onCellPress(p.id) : undefined}
          />
        ))}
      </View>
    </View>
  );
};

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: colors.black },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '49%',
    height: '49%',
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
  },
  selfCell: {
    borderWidth: 1.5,
    borderColor: colors.yellow,
  },
  proCell: {
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.55)',
  },
  proBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flag: {
    position: 'absolute',
    bottom: 4,
    left: 5,
    fontSize: 14,
  },
  youBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.yellow,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  youBadgeText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 8,
  },
  liveBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.yellow,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: { color: '#000', fontSize: 7, fontWeight: '900', letterSpacing: 0.3 },
  loader: { alignItems: 'center', justifyContent: 'center' },
});

export default Mosaic;
