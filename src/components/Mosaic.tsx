import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Pack, PackPhoto, PackMember } from '../types/models';
import { colors, radius } from '../theme/colors';
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
  const isPro = member?.isPro;
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

  const [c1, c2] = photo.placeholder ?? ['#222', '#111'];

  return (
    <Animated.View style={[styles.cell, isSelf && styles.selfCell, isPro && !isSelf && styles.proCell, aStyle]}>
    <Pressable onPress={onPress} disabled={!onPress} style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c1 }]} />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: c2, opacity: 0.5 },
        ]}
      />
      {photo.imageURL ? (
        <FilteredImage
          source={{ uri: photo.imageURL }}
          filter={normalizeFilter(photo.filter)}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : null}
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
        <View style={styles.proBadge}>
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

const styles = StyleSheet.create({
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
});

export default Mosaic;
