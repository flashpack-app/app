import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';

interface MentionTextProps {
  text: string;
  style?: any;
}

export default function MentionText({ text, style }: MentionTextProps) {
  const colors = useColors();
  const nav = useNavigation<any>();

  // Parse text to find @username mentions
  const parseText = (content: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts: Array<{ text: string; isMention: boolean; username?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push({ text: content.slice(lastIndex, match.index), isMention: false });
      }
      // Add the mention
      parts.push({ text: match[0], isMention: true, username: match[1] });
      lastIndex = mentionRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({ text: content.slice(lastIndex), isMention: false });
    }

    return parts;
  };

  const parts = parseText(text);

  const handleMentionPress = (username: string) => {
    nav.navigate('PublicProfile', { username });
  };

  return (
    <Text style={style}>
      {parts.map((part, index) =>
        part.isMention ? (
          <Text
            key={index}
            style={{ color: colors.yellow }}
            onPress={() => handleMentionPress(part.username!)}
          >
            {part.text}
          </Text>
        ) : (
          <Text key={index}>{part.text}</Text>
        )
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  mention: {
    // No additional styling needed, the Text component handles the color
  },
});
