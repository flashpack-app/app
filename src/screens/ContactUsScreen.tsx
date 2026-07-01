import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import ScreenHeader from '../components/ScreenHeader';

export default function ContactUsScreen() {
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation();
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const canSend = topic.trim() && message.trim();

  const onSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      // Placeholder for actual support contact endpoint.
      await new Promise((r) => setTimeout(r, 800));
      Alert.alert('sent', 'we got your message. our team will get back to you soon.');
      nav.goBack();
    } catch {
      Alert.alert('failed', 'could not send your message. try again later.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <ScreenHeader title="contact us" />

      <ScrollView contentContainerStyle={{ padding: 12, gap: 14, paddingBottom: 40 }}>
        <Text style={styles.intro}>have a question or feedback? we read every message.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>topic</Text>
          <TextInput
            style={styles.input}
            placeholder="what is this about?"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={topic}
            onChangeText={setTopic}
            maxLength={80}
          />
        </View>

        <View style={[styles.card, { minHeight: 180 }]}>
          <Text style={styles.label}>message</Text>
          <TextInput
            style={[styles.input, { minHeight: 140, textAlignVertical: 'top' }]}
            placeholder="tell us more..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
        </View>

        <Text style={styles.hint}>
          you can also email us directly at support@flash.app
        </Text>

        <Pressable onPress={onSend} disabled={!canSend || sending} style={[styles.btn, (!canSend || sending) && { opacity: 0.5 }]}>
          {sending ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <Ionicons name="send" size={14} color="#000" />
              <Text style={styles.btnText}>send message</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  intro: { color: colors.textDim, fontSize: 12, lineHeight: 18, marginBottom: 6 },
  card: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  label: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  input: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  hint: {
    color: colors.textFade,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    backgroundColor: colors.yellow,
    borderRadius: 12,
  },
  btnText: { color: '#000', fontWeight: '700', fontSize: 14 },
});
