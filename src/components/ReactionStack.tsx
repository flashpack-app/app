// src/components/ReactionStack.tsx  
import React, { useMemo } from 'react';  
import { View, Text, StyleSheet, Pressable } from 'react-native';  
import type { Palette } from '../theme/colors';  
import { useThemedStyles } from '../theme/useThemedStyles';  
import { Image } from 'expo-image';  
  
interface Reaction { emoji: string; userId: string; }  
interface UserInfo { id: string; username: string; avatarUrl?: string; avatarColor?: string; }  
interface Props {  
  reactions: Reaction[];  
  users: UserInfo[];  
  maxBubbles?: number;  
  onPress?: () => void;  
}  
  
const ReactionStack: React.FC<Props> = ({ reactions, users, maxBubbles = 4, onPress }) => {  
  const styles = useThemedStyles(makeStyles);  
  
  const userMap = useMemo(() => {  
    const map = new Map<string, UserInfo>();  
    if (Array.isArray(users)) for (const u of users) if (u?.id) map.set(u.id, u);  
    return map;  
  }, [users]);  
  
  const visibleReactions = useMemo(() => {  
    const unique = new Map<string, Reaction>();  
    if (Array.isArray(reactions)) {  
      for (const r of reactions) {  
        if (r?.userId && !unique.has(r.userId) && unique.size < maxBubbles) {  
          unique.set(r.userId, r);  
        }  
      }  
    }  
    return Array.from(unique.values());  
  }, [reactions, maxBubbles]);  
  
  const overflow = Math.max(0, (reactions?.length || 0) - maxBubbles);  
  
  if (visibleReactions.length === 0) return null;  
  
  // earlier bubbles must sit on top so their badges aren't covered  
  const count = visibleReactions.length + (overflow > 0 ? 1 : 0);  
  
  return (  
    <Pressable onPress={onPress} style={styles.row} hitSlop={8}>  
      <View style={styles.bubbles}>  
        {visibleReactions.map((r, i) => {  
          const userInfo = userMap.get(r.userId);  
          const username = userInfo?.username || 'anon';  
          const avatarUrl = userInfo?.avatarUrl;  
          const avatarColor = userInfo?.avatarColor || '#666';  
          const initials = username?.charAt(0).toUpperCase() || '?';  
  
          return (  
            <View  
              key={r.userId}  
              style={[  
                styles.avatarBubble,  
                i > 0 && styles.bubbleOverlap,  
                { zIndex: count - i, elevation: count - i },  
              ]}  
            >  
              {/* clip ONLY the avatar image, not the badge */}  
              <View style={styles.avatarClip}>  
                {avatarUrl ? (  
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />  
                ) : (  
                  <View style={[styles.avatar, { backgroundColor: avatarColor }]}>  
                    <Text style={styles.avatarInitial}>{initials}</Text>  
                  </View>  
                )}  
              </View>  
              <View style={styles.emojiBadge}>  
                <Text style={styles.emojiText}>{r.emoji}</Text>  
              </View>  
            </View>  
          );  
        })}  
        {overflow > 0 && (  
          <View  
            style={[  
              styles.avatarBubble,  
              styles.bubbleOverlap,  
              styles.countBubble,  
              { zIndex: 0, elevation: 0 },  
            ]}  
          >  
            <Text style={styles.countText}>+{overflow}</Text>  
          </View>  
        )}  
      </View>  
    </Pressable>  
  );  
};  
  
const makeStyles = (colors: Palette) => StyleSheet.create({  
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },  
  bubbles: { flexDirection: 'row', alignItems: 'center' },  
  avatarBubble: {  
    width: 32,  
    height: 32,  
    borderRadius: 16,  
    backgroundColor: colors?.surfaceSoft || '#2a2a2a',  
    borderWidth: StyleSheet.hairlineWidth,  
    borderColor: 'rgba(255,255,255,0.1)',  
    alignItems: 'center',  
    justifyContent: 'center',  
    // NOTE: no overflow:'hidden' here — that was clipping the badge  
  },  
  avatarClip: {  
    width: 32,  
    height: 32,  
    borderRadius: 16,  
    overflow: 'hidden',  
    alignItems: 'center',  
    justifyContent: 'center',  
  },  
  bubbleOverlap: { marginLeft: -12 },  
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },  
  avatarInitial: { color: '#fff', fontSize: 12, fontWeight: '700' },  
  emojiBadge: {  
    position: 'absolute',  
    bottom: -2,  
    right: -2,  
    width: 16,  
    height: 16,  
    alignItems: 'center',  
    justifyContent: 'center',  
    zIndex: 10,  
    elevation: 8,  
  },  
  emojiText: { fontSize: 12, lineHeight: 12 },  
  countBubble: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.15)' },  
  countText: { color: colors?.white || '#fff', fontSize: 10, fontWeight: '700' },  
});  
  
export default ReactionStack;