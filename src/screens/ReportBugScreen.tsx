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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

export default function ReportBugScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const [bug, setBug] = useState('');
  const [steps, setSteps] = useState('');
  const [sending, setSending] = useState(false);

  const canSend = bug.trim() && steps.trim();

  const onSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      // Placeholder for actual bug-report endpoint.
      await new Promise((r) => setTimeout(r, 800));
      Alert.alert('reported', 'thank you for helping us squash bugs.');
      nav.goBack();
    } catch {
      Alert.alert('failed', 'could not submit your report. try again later.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>report a bug</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, gap: 14, paddingBottom: 40 }}>
        <Text style={styles.intro}>found something broken? the more detail, the faster we can fix it.</Text>

        <View style={[styles.card, { minHeight: 180 }]}>
          <Text style={styles.label}>what happened?</Text>
          <TextInput
            style={[styles.input, { minHeight: 140, textAlignVertical: 'top' }]}
            placeholder="describe the bug..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={bug}
            onChangeText={setBug}
            multiline
            maxLength={1000}
          />
        </View>

        <View style={[styles.card, { minHeight: 160 }]}>
          <Text style={styles.label}>steps to reproduce</Text>
          <TextInput
            style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
            placeholder="1. open app\n2. tap..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={steps}
            onChangeText={setSteps}
            multiline
            maxLength={1000}
          />
        </View>

        <Text style={styles.hint}>screenshots help a lot. send them to support@flash.app if you can.</Text>

        <Pressable onPress={onSend} disabled={!canSend || sending} style={[styles.btn, (!canSend || sending) && { opacity: 0.5 }]}>
          {sending ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <Ionicons name="bug" size={14} color="#000" />
              <Text style={styles.btnText}>submit bug</Text>
            </>
          )}
        </Pressable>
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
