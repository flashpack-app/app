import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../services/haptics';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FlashLogo from '../components/FlashLogo';
import PillButton from '../components/PillButton';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';

// Country codes with dial codes and phone lengths for Twilio SMS
const COUNTRY_CODES = [
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸', length: 10 },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧', length: 10 },
  { code: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷', length: 10 },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪', length: 10 },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷', length: 9 },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸', length: 9 },
  { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹', length: 10 },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱', length: 9 },
  { code: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪', length: 9 },
  { code: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭', length: 9 },
  { code: 'AT', name: 'Austria', dial: '+43', flag: '🇦🇹', length: 10 },
  { code: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪', length: 9 },
  { code: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴', length: 8 },
  { code: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰', length: 8 },
  { code: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮', length: 9 },
  { code: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱', length: 9 },
  { code: 'CZ', name: 'Czech Republic', dial: '+420', flag: '🇨🇿', length: 9 },
  { code: 'HU', name: 'Hungary', dial: '+36', flag: '🇭🇺', length: 9 },
  { code: 'RO', name: 'Romania', dial: '+40', flag: '🇷🇴', length: 9 },
  { code: 'BG', name: 'Bulgaria', dial: '+359', flag: '🇧🇬', length: 9 },
  { code: 'HR', name: 'Croatia', dial: '+385', flag: '🇭🇷', length: 9 },
  { code: 'SI', name: 'Slovenia', dial: '+386', flag: '🇸🇮', length: 8 },
  { code: 'SK', name: 'Slovakia', dial: '+421', flag: '🇸🇰', length: 9 },
  { code: 'LT', name: 'Lithuania', dial: '+370', flag: '🇱🇹', length: 8 },
  { code: 'LV', name: 'Latvia', dial: '+371', flag: '🇱🇻', length: 8 },
  { code: 'EE', name: 'Estonia', dial: '+372', flag: '🇪🇪', length: 7 },
  { code: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪', length: 9 },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹', length: 9 },
  { code: 'GR', name: 'Greece', dial: '+30', flag: '🇬🇷', length: 10 },
  { code: 'CY', name: 'Cyprus', dial: '+357', flag: '🇨🇾', length: 8 },
  { code: 'MT', name: 'Malta', dial: '+356', flag: '🇲🇹', length: 8 },
  { code: 'LU', name: 'Luxembourg', dial: '+352', flag: '🇱🇺', length: 8 },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵', length: 10 },
  { code: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷', length: 10 },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳', length: 11 },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳', length: 10 },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷', length: 10 },
  { code: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽', length: 10 },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦', length: 10 },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺', length: 9 },
  { code: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿', length: 9 },
  { code: 'RU', name: 'Russia', dial: '+7', flag: '🇷🇺', length: 10 },
  { code: 'UA', name: 'Ukraine', dial: '+380', flag: '🇺🇦', length: 9 },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦', length: 9 },
  { code: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬', length: 10 },
  { code: 'IL', name: 'Israel', dial: '+972', flag: '🇮🇱', length: 9 },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪', length: 9 },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦', length: 9 },
  { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦', length: 8 },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬', length: 8 },
  { code: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭', length: 9 },
  { code: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳', length: 9 },
  { code: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩', length: 10 },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾', length: 9 },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭', length: 10 },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰', length: 10 },
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩', length: 10 },
  { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷', length: 10 },
  { code: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱', length: 9 },
  { code: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴', length: 10 },
  { code: 'PE', name: 'Peru', dial: '+51', flag: '🇵🇪', length: 9 },
  { code: 'VE', name: 'Venezuela', dial: '+58', flag: '🇻🇪', length: 10 },
  { code: 'EC', name: 'Ecuador', dial: '+593', flag: '🇪🇨', length: 9 },
].sort((a, b) => a.name.localeCompare(b.name));

async function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch {
    clearTimeout(id);
    throw new Error('timeout');
  }
}

async function getLocationExtras() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    const geo = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
    );
    const data = await geo.json();
    return {
      city: data.address?.city || data.address?.town || data.address?.village || null,
      country: data.address?.country || null,
      flag: data.address?.country_code?.toUpperCase() || null,
    };
  } catch {
    return null;
  }
}

const VALID = /^[a-z0-9_.-]+$/;

export default function PhoneNumberScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const username = route.params?.username as string;
  const inviteCode = route.params?.inviteCode as string;
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES.find(c => c.code === 'US') || COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cleanPhone = phone.replace(/\D/g, ''); // Remove non-digits
  const phoneValid = cleanPhone.length === selectedCountry.length;

  const onJoin = async () => {
    if (!phoneValid) {
      setError('please enter a valid phone number');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const extras = await getLocationExtras();
      // Combine country dial code with phone number
      const fullPhone = `${selectedCountry.dial}${cleanPhone}`;
      // Navigate to OTP screen with username, phone, and invite code
      nav.navigate('OTPScreen', { username, phone: fullPhone, inviteCode, extras });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: Math.max(12, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
      </View>
      <View style={styles.center}>
        <FlashLogo size={36} />
        <Text style={styles.subtitle}>add your phone number for verification.</Text>

        <View style={styles.inputRow}>
          <TouchableOpacity
            onPress={() => setShowCountryPicker(true)}
            style={styles.countrySelector}
          >
            <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
            <Text style={styles.countryDial}>{selectedCountry.dial}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.yellow} />
          </TouchableOpacity>
          <TextInput
            value={phone}
            onChangeText={(t) => {
              setError(null);
              setPhone(t);
            }}
            placeholder={`${'0'.repeat(selectedCountry.length)}`}
            placeholderTextColor="rgba(255,255,255,0.18)"
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            maxLength={selectedCountry.length}
            returnKeyType="send"
            onSubmitEditing={onJoin}
          />
        </View>
        <Text style={styles.hint}>enter your phone number</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <PillButton
          label="join"
          onPress={onJoin}
          variant="yellow"
          disabled={!phoneValid || loading}
          loading={loading}
          style={{ width: '100%', height: 44 }}
        />

        <Text style={styles.codeFootnote}>
          using <Text style={styles.codeMono}>{inviteCode}</Text>
        </Text>
      </View>

      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {COUNTRY_CODES.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={styles.countryItem}
                  onPress={() => {
                    setSelectedCountry(country);
                    setPhone('');
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.countryItemFlag}>{country.flag}</Text>
                  <Text style={styles.countryItemName}>{country.name}</Text>
                  <Text style={styles.countryItemDial}>{country.dial}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  header: { paddingTop: 12, paddingHorizontal: 12 },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 48,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#2a2a2a',
    marginRight: 12,
  },
  countryFlag: { fontSize: 18 },
  countryDial: { color: colors.yellow, fontSize: 14, fontWeight: '600' },
  input: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  hint: { color: colors.textHint, fontSize: 10 },
  error: { color: colors.red, fontSize: 11 },
  codeFootnote: { color: colors.textHint, fontSize: 10, marginTop: 18 },
  codeMono: {
    color: colors.textSecondary,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  modalTitle: { color: colors.white, fontSize: 16, fontWeight: '600' },
  modalClose: { color: colors.yellow, fontSize: 14, fontWeight: '600' },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  countryItemFlag: { fontSize: 20, marginRight: 12 },
  countryItemName: { flex: 1, color: colors.white, fontSize: 15 },
  countryItemDial: { color: colors.textHint, fontSize: 14 },
});
