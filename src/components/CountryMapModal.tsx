import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { colors } from '../theme/colors';
import { getCityCoord } from '../data/cityCoords';

interface CityPin {
  id: string;
  city: string;
  country: string;
  flag: string;
  lat: number;
  lng: number;
  count: number;
}

interface CountryCluster {
  country: string;
  flag: string;
  lat: number;
  lng: number;
  count: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  members: { userId: string; city: string; country: string; flag: string; lat?: number; lng?: number }[];
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MAP_H = Math.min(SCREEN_H * 0.55, 400);
const ZOOM_THRESHOLD = 35; // longitudeDelta — below = city view, above = country clusters

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
];

function resolveCoord(
  city: string,
  country: string,
  serverLat?: number,
  serverLng?: number,
): { lat: number; lng: number } {
  if (serverLat != null && serverLng != null) {
    return { lat: serverLat, lng: serverLng };
  }
  const h = city.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const jLat = ((h * 7) % 40 - 20) / 400;
  const jLng = ((h * 13) % 60 - 30) / 400;
  const c = getCityCoord(city, country);
  if (c) return { lat: c.lat + jLat, lng: c.lng + jLng };
  return { lat: 20 + jLat * 200, lng: ((country.charCodeAt(0) % 360) - 180) + jLng * 200 };
}

const CountryMapModal: React.FC<Props> = ({ visible, onClose, members }) => {
  const [region, setRegion] = useState<Region | null>(null);

  const { cityPins, countryClusters } = useMemo(() => {
    const cityMap = new Map<string, CityPin>();
    const countryMap = new Map<string, CountryCluster>();

    for (const m of members) {
      const key = `${m.city}-${m.country}`;
      if (!cityMap.has(key)) {
        const { lat, lng } = resolveCoord(m.city, m.country, m.lat, m.lng);
        cityMap.set(key, { id: key, city: m.city, country: m.country, flag: m.flag, lat, lng, count: 0 });
      }
      cityMap.get(key)!.count++;

      if (!countryMap.has(m.country)) {
        countryMap.set(m.country, { country: m.country, flag: m.flag, lat: 0, lng: 0, count: 0 });
      }
      const c = countryMap.get(m.country)!;
      c.count++;
    }

    // Average country cluster coords from its cities
    for (const [country, cluster] of countryMap) {
      const cities = Array.from(cityMap.values()).filter((c) => c.country === country);
      if (cities.length > 0) {
        cluster.lat = cities.reduce((s, c) => s + c.lat, 0) / cities.length;
        cluster.lng = cities.reduce((s, c) => s + c.lng, 0) / cities.length;
      }
    }

    return { cityPins: Array.from(cityMap.values()), countryClusters: Array.from(countryMap.values()) };
  }, [members]);

  const showCities = (region?.longitudeDelta ?? 100) < ZOOM_THRESHOLD;

  const initialRegion = useMemo(() => {
    const allLats = cityPins.map((p) => p.lat);
    const allLngs = cityPins.map((p) => p.lng);
    if (allLats.length === 0) return { latitude: 20, longitude: 0, latitudeDelta: 120, longitudeDelta: 180 };
    const minLat = Math.min(...allLats), maxLat = Math.max(...allLats);
    const minLng = Math.min(...allLngs), maxLng = Math.max(...allLngs);
    const pad = 8;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(20, maxLat - minLat + pad * 2),
      longitudeDelta: Math.max(30, maxLng - minLng + pad * 2),
    };
  }, [cityPins]);

  const onRegionChange = useCallback((r: Region) => setRegion(r), []);

  // Build legend from clusters (deduped by country)
  const legendItems = useMemo(() => {
    const map = new Map<string, { flag: string; name: string; count: number }>();
    for (const c of countryClusters) {
      map.set(c.country, { flag: c.flag, name: c.country, count: c.count });
    }
    return Array.from(map.values());
  }, [countryClusters]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header} pointerEvents="auto">
            <Text style={styles.headerTitle}>countries</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.white} />
            </Pressable>
          </View>

          <View style={styles.mapWrap} pointerEvents="auto">
            <MapView
              provider={PROVIDER_DEFAULT}
              style={StyleSheet.absoluteFillObject}
              initialRegion={initialRegion}
              onRegionChangeComplete={onRegionChange}
              customMapStyle={DARK_MAP_STYLE}
              scrollEnabled
              zoomEnabled
              rotateEnabled={false}
              pitchEnabled={false}
            >
              {showCities
                ? cityPins.map((p) => (
                    <Marker
                      key={p.id}
                      coordinate={{ latitude: p.lat, longitude: p.lng }}
                      tracksViewChanges={false}
                    >
                      <View style={styles.cityWrap}>
                        <Text style={styles.cityFlag}>{p.flag}</Text>
                        <Text style={styles.cityLabel}>{p.city}</Text>
                        {p.count > 1 && (
                          <View style={styles.cityBadge}>
                            <Text style={styles.cityCount}>{p.count}</Text>
                          </View>
                        )}
                      </View>
                    </Marker>
                  ))
                : countryClusters.map((c) => (
                    <Marker
                      key={c.country}
                      coordinate={{ latitude: c.lat, longitude: c.lng }}
                      tracksViewChanges={false}
                    >
                      <View style={styles.clusterWrap}>
                        <Text style={styles.clusterFlag}>{c.flag}</Text>
                        <View style={styles.clusterBadge}>
                          <Text style={styles.clusterCount}>{c.count}</Text>
                        </View>
                      </View>
                    </Marker>
                  ))}
            </MapView>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.legend}
            pointerEvents="auto"
          >
            {legendItems.map((c) => (
              <View key={c.name} style={styles.legendItem}>
                <Text style={styles.legendFlag}>{c.flag}</Text>
                <Text style={styles.legendName}>{c.name}</Text>
                <Text style={styles.legendCount}>×{c.count}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.80)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: Math.min(SCREEN_W - 32, 400),
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: colors.white, fontSize: 14, fontWeight: '700' },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapWrap: {
    width: '100%',
    height: MAP_H,
    backgroundColor: '#0d1117',
  },
  cityWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,10,0.85)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,214,10,0.30)',
  },
  cityFlag: { fontSize: 16 },
  cityLabel: {
    color: colors.white,
    fontSize: 8,
    fontWeight: '700',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cityBadge: {
    marginTop: 1,
    backgroundColor: colors.yellow,
    borderRadius: 6,
    minWidth: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityCount: { color: '#000', fontSize: 8, fontWeight: '800' },
  clusterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterFlag: {
    fontSize: 26,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  clusterBadge: {
    marginTop: -6,
    backgroundColor: colors.yellow,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#0A0A0A',
  },
  clusterCount: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
  },
  legend: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  legendFlag: { fontSize: 12 },
  legendName: { color: colors.textSecondary, fontSize: 10 },
  legendCount: { color: colors.yellow, fontSize: 10, fontWeight: '700' },
});

export default CountryMapModal;
