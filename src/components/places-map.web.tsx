import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Brand } from '@/constants/brand';
import { haptic } from '@/lib/haptics';
import type { Place } from '@/lib/places';

export type PlacesMapProps = {
  places: Place[];
  bottomInset?: number;
};

function getPlacesMapHtml(
  placesData: { id: string; name: string; latitude: number; longitude: number }[],
): string {
  const jsonPlaces = JSON.stringify(placesData);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map {
      width: 100%;
      height: 100%;
      background: #0B0B12;
      touch-action: none;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    .place-pin {
      width: 40px;
      height: 40px;
      margin-left: -20px;
      margin-top: -40px;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.6));
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .place-pin:active { transform: scale(1.25); }
    .user-pin-wrapper { width: 22px; height: 22px; position: relative; }
    .user-pin {
      width: 18px; height: 18px;
      background: #3B82F6;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
      position: absolute; top: 2px; left: 2px;
    }
    .user-pin-pulse {
      position: absolute; top: -3px; left: -3px;
      width: 28px; height: 28px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.35);
      animation: pulse 2s infinite ease-out;
    }
    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var rawPlaces = ${jsonPlaces};
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([-23.5505, -46.6333], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    var markersGroup = L.featureGroup().addTo(map);
    var userMarker = null;

    function createPinSvg() {
      return '<svg class="place-pin" viewBox="0 0 24 24">' +
        '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#FF6B4A"/>' +
        '<circle cx="12" cy="9" r="3" fill="#FFFFFF"/>' +
        '</svg>';
    }

    function renderMarkers(list) {
      markersGroup.clearLayers();
      var bounds = [];

      list.forEach(function(p) {
        if (typeof p.latitude === 'number' && typeof p.longitude === 'number') {
          var icon = L.divIcon({
            className: '',
            html: createPinSvg(),
            iconSize: [40, 40],
            iconAnchor: [20, 40]
          });

          var marker = L.marker([p.latitude, p.longitude], { icon: icon });

          marker.on('click', function(e) {
            L.DomEvent.stopPropagation(e);
            window.parent.postMessage(JSON.stringify({
              type: 'SELECT_PLACE',
              placeId: p.id,
              latitude: p.latitude,
              longitude: p.longitude
            }), '*');
          });

          markersGroup.addLayer(marker);
          bounds.push([p.latitude, p.longitude]);
        }
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      }
    }

    renderMarkers(rawPlaces);

    map.on('click', function() {
      window.parent.postMessage(JSON.stringify({ type: 'DESELECT_PLACE' }), '*');
    });

    window.addEventListener('message', function(e) {
      try {
        var msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (msg.action === 'UPDATE_PLACES') {
          renderMarkers(msg.places);
        } else if (msg.action === 'FOCUS_PLACE') {
          map.setView([msg.lat, msg.lng], 16, { animate: true });
        } else if (msg.action === 'FIT_ALL') {
          var layers = markersGroup.getLayers();
          if (layers.length > 0) {
            map.fitBounds(markersGroup.getBounds(), { padding: [60, 60], maxZoom: 15 });
          }
        } else if (msg.action === 'ZOOM_IN') {
          map.zoomIn();
        } else if (msg.action === 'ZOOM_OUT') {
          map.zoomOut();
        } else if (msg.action === 'SET_USER_LOCATION') {
          if (!userMarker) {
            var userIcon = L.divIcon({
              className: '',
              html: '<div class="user-pin-wrapper"><div class="user-pin-pulse"></div><div class="user-pin"></div></div>',
              iconSize: [22, 22],
              iconAnchor: [11, 11]
            });
            userMarker = L.marker([msg.lat, msg.lng], { icon: userIcon, zIndexOffset: 2000 }).addTo(map);
          } else {
            userMarker.setLatLng([msg.lat, msg.lng]);
          }
          map.setView([msg.lat, msg.lng], 15, { animate: true });
        }
      } catch (err) {}
    });
  </script>
</body>
</html>`;
}

export function PlacesMap({ places, bottomInset = 0 }: PlacesMapProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);

  const mappedPlaces = useMemo(
    () =>
      places.filter(
        (p): p is Place & { latitude: number; longitude: number } =>
          typeof p.latitude === 'number' && typeof p.longitude === 'number',
      ),
    [places],
  );

  const placesPayload = useMemo(
    () =>
      mappedPlaces.map((p) => ({
        id: p.id,
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
      })),
    [mappedPlaces],
  );

  const htmlDoc = useMemo(() => getPlacesMapHtml(placesPayload), [placesPayload]);

  const selectedPlace = useMemo(
    () => places.find((p) => p.id === selectedPlaceId) ?? null,
    [places, selectedPlaceId],
  );

  useEffect(() => {
    function handleWindowMessage(e: MessageEvent) {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data?.type === 'SELECT_PLACE' && data.placeId) {
          haptic.selection();
          setSelectedPlaceId(data.placeId);
        } else if (data?.type === 'DESELECT_PLACE') {
          setSelectedPlaceId(null);
        }
      } catch {
        // Ignora
      }
    }

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, []);

  function postToIframe(msg: Record<string, unknown>) {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), '*');
  }

  function handleLocateUser() {
    if (!navigator.geolocation) {
      Alert.alert('Erro', 'Geolocalização não é suportada neste navegador.');
      return;
    }

    setLocatingUser(true);
    haptic.selection();

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        haptic.success();
        postToIframe({
          action: 'SET_USER_LOCATION',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        setLocatingUser(false);
        haptic.error();
        Alert.alert('Erro', err.message || 'Não foi possível obter sua localização.');
      },
    );
  }

  return (
    <View style={styles.container}>
      {/* Iframe HTML com o mapa Leaflet para Web */}
      <iframe
        ref={iframeRef}
        srcDoc={htmlDoc}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: '#0B0B12',
        }}
        title="Mapa de Locais"
      />

      {/* Badge Superior */}
      <View style={styles.countBadge} pointerEvents="none">
        <Text style={styles.countBadgeText}>
          {mappedPlaces.length === 0
            ? 'Nenhum local no mapa'
            : `📍 ${mappedPlaces.length} ${
                mappedPlaces.length === 1 ? 'local no mapa' : 'locais no mapa'
              }${
                places.length > mappedPlaces.length
                  ? ` · ${places.length - mappedPlaces.length} sem coordenadas`
                  : ''
              }`}
        </Text>
      </View>

      {/* Controles Flutuantes */}
      <View style={styles.floatingControls}>
        <Pressable
          onPress={() => {
            haptic.light();
            postToIframe({ action: 'ZOOM_IN' });
          }}
          style={styles.ctrlBtn}
          accessibilityRole="button">
          <Text style={styles.ctrlBtnText}>+</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            haptic.light();
            postToIframe({ action: 'ZOOM_OUT' });
          }}
          style={styles.ctrlBtn}
          accessibilityRole="button">
          <Text style={styles.ctrlBtnText}>−</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            haptic.light();
            postToIframe({ action: 'FIT_ALL' });
          }}
          style={styles.ctrlBtn}
          accessibilityRole="button">
          <Text style={styles.ctrlBtnIcon}>🎯</Text>
        </Pressable>

        <Pressable
          onPress={handleLocateUser}
          disabled={locatingUser}
          style={styles.ctrlBtn}
          accessibilityRole="button">
          {locatingUser ? (
            <ActivityIndicator size="small" color={Brand.accent} />
          ) : (
            <Text style={styles.ctrlBtnIcon}>📍</Text>
          )}
        </Pressable>
      </View>

      {/* Card Flutuante de Prévia */}
      {selectedPlace ? (
        <View style={[styles.previewCardWrap, { bottom: bottomInset + 84 }]}>
          <Pressable
            onPress={() => {
              haptic.selection();
              router.push({
                pathname: '/place/[id]',
                params: { id: selectedPlace.id },
              });
            }}
            style={styles.previewCard}
            accessibilityRole="button">
            <View style={styles.previewCover}>
              {selectedPlace.coverThumbUrl || selectedPlace.coverUrl ? (
                <Image
                  source={{ uri: selectedPlace.coverThumbUrl ?? selectedPlace.coverUrl ?? '' }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={180}
                />
              ) : (
                <LinearGradient colors={['#2A2A3F', '#1A1A28']} style={styles.noCover}>
                  <Text style={styles.noCoverIcon}>🍽️</Text>
                </LinearGradient>
              )}
            </View>

            <View style={styles.previewInfo}>
              <View style={styles.previewTitleRow}>
                <Text style={styles.previewName} numberOfLines={1}>
                  {selectedPlace.name}
                </Text>
                <View style={styles.previewRatingBadge}>
                  <Text style={styles.previewStar}>★</Text>
                  <Text style={styles.previewRatingText}>
                    {selectedPlace.reviewCount > 0
                      ? selectedPlace.avgRating.toFixed(1)
                      : 'Novo'}
                  </Text>
                </View>
              </View>

              {selectedPlace.address ? (
                <Text style={styles.previewAddress} numberOfLines={1}>
                  {selectedPlace.address}
                </Text>
              ) : null}

              <View style={styles.previewFooterRow}>
                <View style={styles.previewTags}>
                  {selectedPlace.tags.slice(0, 2).map((t) => (
                    <View key={t} style={styles.previewTagChip}>
                      <Text style={styles.previewTagText}>#{t}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.previewActionText}>Ver detalhes ›</Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                haptic.light();
                setSelectedPlaceId(null);
              }}
              hitSlop={12}
              style={styles.closeCardBtn}
              accessibilityRole="button">
              <Text style={styles.closeCardText}>✕</Text>
            </Pressable>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.bg,
    position: 'relative',
  },
  countBadge: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(11, 11, 18, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  floatingControls: {
    position: 'absolute',
    right: 14,
    top: 14,
    gap: 8,
  },
  ctrlBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(18, 18, 28, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  ctrlBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  ctrlBtnIcon: {
    fontSize: 15,
  },
  previewCardWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  previewCard: {
    backgroundColor: Brand.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.border,
    flexDirection: 'row',
    padding: 10,
    gap: 12,
    alignItems: 'center',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  previewCover: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Brand.surfaceHigh,
  },
  noCover: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCoverIcon: {
    fontSize: 28,
    opacity: 0.8,
  },
  previewInfo: {
    flex: 1,
    gap: 4,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 22,
  },
  previewName: {
    color: Brand.text,
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  previewRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 107, 74, 0.14)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  previewStar: {
    color: Brand.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  previewRatingText: {
    color: Brand.text,
    fontSize: 11,
    fontWeight: '800',
  },
  previewAddress: {
    color: Brand.textMuted,
    fontSize: 12,
  },
  previewFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  previewTags: {
    flexDirection: 'row',
    gap: 4,
  },
  previewTagChip: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  previewTagText: {
    color: '#B7A0FF',
    fontSize: 10,
    fontWeight: '700',
  },
  previewActionText: {
    color: Brand.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  closeCardBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCardText: {
    color: Brand.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
