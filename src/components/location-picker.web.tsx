import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { haptic } from '@/lib/haptics';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

type LocationPickerProps = {
  address: string;
  onAddressChange: (newAddress: string) => void;
  coordinates: Coordinates | null;
  onCoordinatesChange: (coords: Coordinates | null) => void;
  onMapTouchStart?: () => void;
  onMapTouchEnd?: () => void;
};

async function searchGeocodeWeb(query: string): Promise<Coordinates | null> {
  if (!query || query.trim().length < 3) return null;
  const clean = query.trim();

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean)}&limit=1`,
      { headers: { 'User-Agent': 'TierRoleApp/1.0' } },
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      }
    }
  } catch {
    // Falha
  }

  if (!clean.toLowerCase().includes('brasil') && !clean.toLowerCase().includes('brazil')) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${clean}, Brasil`)}&limit=1`,
        { headers: { 'User-Agent': 'TierRoleApp/1.0' } },
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
          };
        }
      }
    } catch {
      // Falha
    }
  }

  return null;
}

export function LocationPicker({
  address,
  onAddressChange,
  coordinates,
  onCoordinatesChange,
}: LocationPickerProps) {
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const lastGeocodedAddressRef = useRef<string>('');
  const debouncedAddress = useDebouncedValue(address, 900);

  useEffect(() => {
    if (!debouncedAddress || debouncedAddress.trim().length < 3) return;
    if (
      debouncedAddress.trim().toLowerCase() ===
      lastGeocodedAddressRef.current.trim().toLowerCase()
    ) {
      return;
    }

    let isMounted = true;
    async function sync() {
      setSearchingAddress(true);
      const coords = await searchGeocodeWeb(debouncedAddress);
      if (!isMounted) return;
      setSearchingAddress(false);

      if (coords) {
        lastGeocodedAddressRef.current = debouncedAddress;
        onCoordinatesChange(coords);
        setFeedback('✓ Ponto localizado!');
        setTimeout(() => {
          if (isMounted) setFeedback(null);
        }, 3000);
      }
    }

    sync();

    return () => {
      isMounted = false;
    };
  }, [debouncedAddress, onCoordinatesChange]);

  async function handleLocateTypedAddress() {
    if (!address || address.trim().length < 3) {
      Alert.alert('Endereço necessário', 'Digite um endereço acima para buscar.');
      return;
    }
    setSearchingAddress(true);
    const coords = await searchGeocodeWeb(address);
    setSearchingAddress(false);

    if (coords) {
      haptic.success();
      lastGeocodedAddressRef.current = address;
      onCoordinatesChange(coords);
      setFeedback('✓ Ponto localizado!');
      setTimeout(() => setFeedback(null), 3000);
    } else {
      haptic.error();
      Alert.alert('Não localizado', 'Não foi possível encontrar as coordenadas para este endereço.');
    }
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      Alert.alert('Não suportado', 'Geolocalização não é suportada neste navegador.');
      return;
    }

    setLoadingLocation(true);
    haptic.selection();

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: Coordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        onCoordinatesChange(coords);
        setLoadingLocation(false);
        haptic.success();

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&addressdetails=1`,
          );
          if (response.ok) {
            const data = await response.json();
            const addr = data.address || {};
            const road = addr.road || addr.pedestrian || addr.street || '';
            const houseNumber = addr.house_number || '';
            const streetPart = [road, houseNumber].filter(Boolean).join(', ');
            const neighborhood = addr.neighbourhood || addr.suburb || addr.city_district || '';
            const cityPart = [neighborhood, addr.city || addr.town || addr.municipality]
              .filter(Boolean)
              .join(' - ');
            const formatted = [streetPart, cityPart].filter(Boolean).join(' · ');

            if (formatted.trim()) {
              lastGeocodedAddressRef.current = formatted.trim();
              onAddressChange(formatted.trim());
            }
          }
        } catch {
          // Silencioso
        }
      },
      (err) => {
        setLoadingLocation(false);
        haptic.error();
        Alert.alert('Erro de Localização', err.message || 'Não foi possível obter sua localização.');
      },
    );
  }

  function handleClearLocation() {
    haptic.light();
    onCoordinatesChange(null);
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Ponto exato no mapa (opcional)</Text>
        {coordinates ? (
          <Pressable onPress={handleClearLocation} hitSlop={8} accessibilityRole="button">
            <Text style={styles.clearBtnText}>✕ Limpar ponto</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.actionButtonsRow}>
        <Pressable
          onPress={handleUseCurrentLocation}
          disabled={loadingLocation}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
          accessibilityRole="button">
          {loadingLocation ? (
            <ActivityIndicator size="small" color={Brand.accent} />
          ) : (
            <Text style={styles.actionBtnText}>📍 Minha localização atual</Text>
          )}
        </Pressable>

        {address.trim().length >= 3 ? (
          <Pressable
            onPress={handleLocateTypedAddress}
            disabled={searchingAddress}
            style={({ pressed }) => [styles.actionBtn, styles.actionBtnAccent, pressed && { opacity: 0.8 }]}
            accessibilityRole="button">
            {searchingAddress ? (
              <ActivityIndicator size="small" color={Brand.accent} />
            ) : (
              <Text style={[styles.actionBtnText, { color: Brand.accent }]}>
                🔍 Localizar endereço
              </Text>
            )}
          </Pressable>
        ) : null}
      </View>

      {feedback ? (
        <Text style={styles.feedbackText}>{feedback}</Text>
      ) : null}

      {coordinates ? (
        <View style={styles.coordsBadge}>
          <Text style={styles.coordsBadgeText}>
            Coordenadas: {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: Brand.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  clearBtnText: {
    color: Brand.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    minWidth: 120,
    height: 44,
    backgroundColor: Brand.surface,
    borderColor: Brand.border,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  actionBtnAccent: {
    borderColor: 'rgba(255, 107, 74, 0.4)',
    backgroundColor: 'rgba(255, 107, 74, 0.08)',
  },
  actionBtnText: {
    color: Brand.text,
    fontSize: 13,
    fontWeight: '700',
  },
  feedbackText: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '700',
  },
  coordsBadge: {
    backgroundColor: Brand.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  coordsBadgeText: {
    color: Brand.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
});
