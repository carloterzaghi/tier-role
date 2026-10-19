import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

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

/** Gera o HTML do mapa Leaflet com tiles OpenStreetMap livres de chaves e de billing */
function getLeafletHtml(initialLat: number, initialLng: number, hasPin: boolean): string {
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
      background: #15151F;
      touch-action: none;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      -webkit-user-select: none;
    }
    .custom-pin {
      width: 36px;
      height: 36px;
      margin-left: -18px;
      margin-top: -36px;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.6));
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var initialLat = ${initialLat};
    var initialLng = ${initialLng};
    var hasPin = ${hasPin};

    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      tap: true,
      fadeAnimation: false,
      zoomAnimation: true
    }).setView([initialLat, initialLng], hasPin ? 16 : 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    var pinIcon = L.divIcon({
      className: '',
      html: '<svg class="custom-pin" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#FF6B4A"/><circle cx="12" cy="9" r="2.8" fill="#FFFFFF"/></svg>',
      iconSize: [36, 36],
      iconAnchor: [18, 36]
    });

    var marker = null;

    function notifyTouch(t) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: t }));
      }
    }

    function sendCoords(lat, lng) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'COORDINATES_SELECTED',
          latitude: lat,
          longitude: lng
        }));
      }
    }

    function attachMarkerEvents(m) {
      m.on('dragstart', function() { notifyTouch('TOUCH_START'); });
      m.on('dragend', function() {
        var p = m.getLatLng();
        sendCoords(p.lat, p.lng);
        notifyTouch('TOUCH_END');
      });
    }

    if (hasPin) {
      marker = L.marker([initialLat, initialLng], { icon: pinIcon, draggable: true }).addTo(map);
      attachMarkerEvents(marker);
    }

    document.addEventListener('touchstart', function() { notifyTouch('TOUCH_START'); }, { passive: true });
    document.addEventListener('touchend', function() { notifyTouch('TOUCH_END'); }, { passive: true });
    document.addEventListener('touchcancel', function() { notifyTouch('TOUCH_END'); }, { passive: true });

    map.on('click', function(e) {
      var lat = e.latlng.lat;
      var lng = e.latlng.lng;
      if (!marker) {
        marker = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
        attachMarkerEvents(marker);
      } else {
        marker.setLatLng([lat, lng]);
      }
      sendCoords(lat, lng);
    });

    window.updatePin = function(lat, lng) {
      map.setView([lat, lng], 16, { animate: true });
      if (!marker) {
        marker = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
        attachMarkerEvents(marker);
      } else {
        marker.setLatLng([lat, lng]);
      }
    };

    window.removePin = function() {
      if (marker) {
        map.removeLayer(marker);
        marker = null;
      }
    };

    window.zoomIn = function() {
      map.zoomIn();
    };

    window.zoomOut = function() {
      map.zoomOut();
    };

    window.centerOnPin = function() {
      if (marker) {
        map.setView(marker.getLatLng(), 16, { animate: true });
      }
    };
  </script>
</body>
</html>`;
}

/** Converte texto de busca em coordenadas geográficas */
async function searchGeocode(query: string): Promise<Coordinates | null> {
  if (!query || query.trim().length < 3) return null;
  const clean = query.trim();

  // 1. Tenta expo-location
  try {
    const results = await Location.geocodeAsync(clean);
    if (results && results.length > 0) {
      return {
        latitude: results[0].latitude,
        longitude: results[0].longitude,
      };
    }
  } catch {
    // Continua para fallback
  }

  // 2. Nominatim OpenStreetMap (livre de chaves e permissões)
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
    // Continua
  }

  // 3. Fallback Nominatim com sufixo Brasil caso não tenha especificado
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
  onMapTouchStart,
  onMapTouchEnd,
}: LocationPickerProps) {
  const webViewRef = useRef<WebView>(null);
  const modalWebViewRef = useRef<WebView>(null);

  const [loadingLocation, setLoadingLocation] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Busca dentro do Modal
  const [modalSearchText, setModalSearchText] = useState('');
  const [modalSearching, setModalSearching] = useState(false);

  // Evita re-geocodificar quando o endereço foi gerado pelo próprio clique no mapa
  const lastGeocodedAddressRef = useRef<string>('');
  const debouncedAddress = useDebouncedValue(address, 900);

  // Ponto inicial do mapa: coordenadas atuais ou centro de SP
  const initialLat = coordinates?.latitude ?? -23.5505;
  const initialLng = coordinates?.longitude ?? -46.6333;
  const hasPin = !!coordinates;

  const htmlSource = useMemo(
    () => ({ html: getLeafletHtml(initialLat, initialLng, hasPin) }),
    // Recarrega apenas se abrir o mapa pela primeira vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showMap],
  );

  const modalHtmlSource = useMemo(
    () => ({ html: getLeafletHtml(initialLat, initialLng, hasPin) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isModalOpen],
  );

  /** Sincronização automática: quando o usuário digita no campo de endereço, localiza no mapa */
  useEffect(() => {
    if (!debouncedAddress || debouncedAddress.trim().length < 3) return;

    // Se o endereço foi o mesmo preenchido pelo reverse geocode do mapa, ignora
    if (
      debouncedAddress.trim().toLowerCase() ===
      lastGeocodedAddressRef.current.trim().toLowerCase()
    ) {
      return;
    }

    let isMounted = true;

    async function syncAddressToMap() {
      setSearchingAddress(true);
      const coords = await searchGeocode(debouncedAddress);
      if (!isMounted) return;
      setSearchingAddress(false);

      if (coords) {
        lastGeocodedAddressRef.current = debouncedAddress;
        onCoordinatesChange(coords);
        setShowMap(true);
        setSearchFeedback('✓ Localizado no mapa!');
        webViewRef.current?.injectJavaScript(
          `if (window.updatePin) { window.updatePin(${coords.latitude}, ${coords.longitude}); } true;`,
        );
        setTimeout(() => {
          if (isMounted) setSearchFeedback(null);
        }, 3000);
      }
    }

    syncAddressToMap();

    return () => {
      isMounted = false;
    };
  }, [debouncedAddress, onCoordinatesChange]);

  /** Converte coordenadas em texto de endereço de forma resiliente */
  async function reverseGeocode(coords: Coordinates) {
    try {
      let formatted = '';

      // 1. Tenta geocodificador nativo apenas se houver permissão
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status === 'granted') {
          const results = await Location.reverseGeocodeAsync(coords);
          if (results && results.length > 0) {
            const place = results[0];
            const streetPart = [place.street, place.streetNumber].filter(Boolean).join(', ');
            const neighborhood = place.district || place.subregion;
            const cityPart = [neighborhood, place.city].filter(Boolean).join(' - ');
            formatted = [streetPart, cityPart].filter(Boolean).join(' · ');
          }
        }
      } catch {
        // Fallback HTTP
      }

      // 2. Fallback via API HTTP (OpenStreetMap Nominatim)
      if (!formatted) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'TierRoleApp/1.0',
              },
            },
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
            formatted = [streetPart, cityPart].filter(Boolean).join(' · ');
          }
        } catch {
          // Silencioso
        }
      }

      if (formatted.trim()) {
        lastGeocodedAddressRef.current = formatted.trim();
        onAddressChange(formatted.trim());
      }
    } catch {
      // Silencioso
    }
  }

  /** Localização manual do endereço digitado pelo usuário */
  async function handleLocateTypedAddress() {
    if (!address || address.trim().length < 3) {
      Alert.alert(
        'Endereço necessário',
        'Digite uma rua, bairro ou número no campo de Endereço acima para localizar no mapa.',
      );
      return;
    }
    haptic.selection();
    setSearchingAddress(true);
    setSearchFeedback(null);
    const coords = await searchGeocode(address);
    setSearchingAddress(false);

    if (coords) {
      haptic.success();
      lastGeocodedAddressRef.current = address;
      onCoordinatesChange(coords);
      setShowMap(true);
      setSearchFeedback('✓ Localizado no mapa!');
      webViewRef.current?.injectJavaScript(
        `if (window.updatePin) { window.updatePin(${coords.latitude}, ${coords.longitude}); } true;`,
      );
      setTimeout(() => setSearchFeedback(null), 3000);
    } else {
      haptic.error();
      Alert.alert(
        'Endereço não localizado',
        'Não foi possível encontrar este endereço no mapa automaticamente. Toque no mapa para marcar o ponto manualmente.',
      );
    }
  }

  /** Obtém a localização GPS do celular e atualiza o mapa */
  async function handleUseCurrentLocation(targetWebView?: WebView | null) {
    setLoadingLocation(true);
    haptic.selection();

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        haptic.error();
        Alert.alert(
          'Permissão de Localização',
          'Permita o acesso à localização nas configurações do seu celular para marcar o ponto automaticamente.',
        );
        setLoadingLocation(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newCoords: Coordinates = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      onCoordinatesChange(newCoords);
      setShowMap(true);
      haptic.success();

      const activeView = targetWebView ?? webViewRef.current;
      activeView?.injectJavaScript(
        `if (window.updatePin) { window.updatePin(${newCoords.latitude}, ${newCoords.longitude}); } true;`,
      );

      await reverseGeocode(newCoords);
    } catch (e) {
      haptic.error();
      Alert.alert(
        'Erro de Localização',
        'Não foi possível obter sua localização no momento. Você pode tocar no mapa para marcar.',
      );
      console.warn('[LocationPicker] Erro ao obter posição:', e);
    } finally {
      setLoadingLocation(false);
    }
  }

  /** Mensagem recebida do WebView quando o usuário clica ou arrasta o pino no mapa */
  function handleWebViewMessage(event: WebViewMessageEvent, isFromModal = false) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'TOUCH_START') {
        onMapTouchStart?.();
      } else if (data.type === 'TOUCH_END') {
        onMapTouchEnd?.();
      } else if (data.type === 'COORDINATES_SELECTED') {
        const coords: Coordinates = {
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
        };
        haptic.selection();
        onCoordinatesChange(coords);
        reverseGeocode(coords);

        if (isFromModal) {
          // Sincroniza o mapa inline
          webViewRef.current?.injectJavaScript(
            `if (window.updatePin) { window.updatePin(${coords.latitude}, ${coords.longitude}); } true;`,
          );
        }
      }
    } catch {
      // Ignora mensagens inesperadas
    }
  }

  /** Busca dentro da tela cheia */
  async function handleModalSearch() {
    if (!modalSearchText || modalSearchText.trim().length < 3) return;
    haptic.selection();
    setModalSearching(true);
    const coords = await searchGeocode(modalSearchText);
    setModalSearching(false);

    if (coords) {
      haptic.success();
      lastGeocodedAddressRef.current = modalSearchText;
      onCoordinatesChange(coords);
      modalWebViewRef.current?.injectJavaScript(
        `if (window.updatePin) { window.updatePin(${coords.latitude}, ${coords.longitude}); } true;`,
      );
      reverseGeocode(coords);
    } else {
      haptic.error();
      Alert.alert('Não encontrado', 'Não encontramos este endereço. Toque no mapa para marcar.');
    }
  }

  /** Remove o ponto salvo */
  function handleClearLocation() {
    haptic.light();
    onCoordinatesChange(null);
    webViewRef.current?.injectJavaScript(`if (window.removePin) { window.removePin(); } true;`);
    modalWebViewRef.current?.injectJavaScript(`if (window.removePin) { window.removePin(); } true;`);
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

      {/* Botões de Ação */}
      <View style={styles.actionButtonsRow}>
        <Pressable
          onPress={() => handleUseCurrentLocation()}
          disabled={loadingLocation}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
          accessibilityRole="button">
          {loadingLocation ? (
            <ActivityIndicator size="small" color={Brand.accent} />
          ) : (
            <Text style={styles.actionBtnText}>📍 Minha localização</Text>
          )}
        </Pressable>

        {address.trim().length >= 3 ? (
          <Pressable
            onPress={handleLocateTypedAddress}
            disabled={searchingAddress}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnAccent,
              pressed && { opacity: 0.8 },
            ]}
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

        <Pressable
          onPress={() => {
            haptic.selection();
            setShowMap(!showMap);
          }}
          style={({ pressed }) => [
            styles.actionBtn,
            showMap && styles.actionBtnActive,
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button">
          <Text style={[styles.actionBtnText, showMap && styles.actionBtnTextActive]}>
            {showMap ? '🗺️ Ocultar' : '🗺️ Abrir mapa'}
          </Text>
        </Pressable>
      </View>

      {/* Mapa Interativo Leaflet via WebView */}
      {showMap ? (
        <View
          style={styles.mapContainer}
          onTouchStart={() => onMapTouchStart?.()}
          onTouchEnd={() => onMapTouchEnd?.()}
          onTouchCancel={() => onMapTouchEnd?.()}>
          <WebView
            ref={webViewRef}
            source={htmlSource}
            onMessage={(e) => handleWebViewMessage(e, false)}
            style={styles.map}
            scrollEnabled={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
          />

          {/* Dica flutuante sobre o mapa */}
          <View style={styles.mapHelpBadge} pointerEvents="none">
            {searchingAddress ? (
              <View style={styles.badgeRow}>
                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.mapHelpText}>Localizando endereço no mapa...</Text>
              </View>
            ) : searchFeedback ? (
              <Text style={[styles.mapHelpText, { color: '#4ADE80' }]}>{searchFeedback}</Text>
            ) : (
              <Text style={styles.mapHelpText}>
                {coordinates
                  ? '📍 Ponto marcado! Arraste ou toque para ajustar.'
                  : '👆 Toque no mapa para marcar o ponto exato.'}
              </Text>
            )}
          </View>

          {/* Controles de Zoom e Centralização Flutuantes */}
          <View style={styles.floatingControls}>
            <Pressable
              onPress={() => {
                haptic.light();
                webViewRef.current?.injectJavaScript('if(window.zoomIn){window.zoomIn();}true;');
              }}
              style={({ pressed }) => [styles.ctrlBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Aumentar zoom">
              <Text style={styles.ctrlBtnText}>+</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                haptic.light();
                webViewRef.current?.injectJavaScript('if(window.zoomOut){window.zoomOut();}true;');
              }}
              style={({ pressed }) => [styles.ctrlBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Diminuir zoom">
              <Text style={styles.ctrlBtnText}>−</Text>
            </Pressable>
            {coordinates ? (
              <Pressable
                onPress={() => {
                  haptic.light();
                  webViewRef.current?.injectJavaScript(
                    'if(window.centerOnPin){window.centerOnPin();}true;',
                  );
                }}
                style={({ pressed }) => [styles.ctrlBtn, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="Centralizar no pino">
                <Text style={styles.ctrlBtnIcon}>🎯</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Botão de Tela Cheia */}
          <Pressable
            onPress={() => {
              haptic.selection();
              setModalSearchText(address);
              setIsModalOpen(true);
            }}
            style={({ pressed }) => [styles.fullscreenToggleBtn, pressed && { opacity: 0.8 }]}
            accessibilityRole="button">
            <Text style={styles.fullscreenToggleText}>⛶ Tela cheia</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Coordenadas selecionadas */}
      {coordinates ? (
        <View style={styles.coordsBadge}>
          <Text style={styles.coordsBadgeText}>
            Coordenadas: {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
          </Text>
        </View>
      ) : null}

      {/* Modal em Tela Cheia para Navegação Espaçosa e Confortável */}
      <Modal visible={isModalOpen} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.modalRoot} edges={['top', 'bottom']}>
          {/* Cabeçalho do Modal */}
          <View style={styles.modalHeader}>
            <Pressable
              onPress={() => setIsModalOpen(false)}
              hitSlop={12}
              style={styles.modalCloseBtn}
              accessibilityRole="button">
              <Text style={styles.modalCloseText}>✕ Fechar</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Localização no Mapa</Text>
            <Pressable
              onPress={() => {
                haptic.success();
                setIsModalOpen(false);
                setShowMap(true);
                if (coordinates) {
                  webViewRef.current?.injectJavaScript(
                    `if (window.updatePin) { window.updatePin(${coordinates.latitude}, ${coordinates.longitude}); } true;`,
                  );
                }
              }}
              hitSlop={12}
              style={styles.modalDoneBtn}
              accessibilityRole="button">
              <Text style={styles.modalDoneText}>Concluir</Text>
            </Pressable>
          </View>

          {/* Barra de Pesquisa dentro do Modal */}
          <View style={styles.modalSearchRow}>
            <TextInput
              style={styles.modalSearchInput}
              value={modalSearchText}
              onChangeText={setModalSearchText}
              placeholder="Pesquisar rua, bairro, cidade..."
              placeholderTextColor={Brand.textMuted}
              returnKeyType="search"
              onSubmitEditing={handleModalSearch}
            />
            {modalSearching ? (
              <ActivityIndicator size="small" color={Brand.accent} style={{ paddingHorizontal: 12 }} />
            ) : (
              <Pressable
                onPress={handleModalSearch}
                style={styles.modalSearchActionBtn}
                accessibilityRole="button">
                <Text style={styles.modalSearchActionText}>Buscar</Text>
              </Pressable>
            )}
          </View>

          {/* Mapa em Tela Cheia */}
          <View style={styles.modalMapContainer}>
            <WebView
              ref={modalWebViewRef}
              source={modalHtmlSource}
              onMessage={(e) => handleWebViewMessage(e, true)}
              style={styles.map}
              scrollEnabled={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              originWhitelist={['*']}
            />

            {/* Controles Flutuantes da Tela Cheia */}
            <View style={styles.modalFloatingControls}>
              <Pressable
                onPress={() => {
                  haptic.light();
                  modalWebViewRef.current?.injectJavaScript(
                    'if(window.zoomIn){window.zoomIn();}true;',
                  );
                }}
                style={styles.modalCtrlBtn}
                accessibilityRole="button">
                <Text style={styles.ctrlBtnText}>+</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  haptic.light();
                  modalWebViewRef.current?.injectJavaScript(
                    'if(window.zoomOut){window.zoomOut();}true;',
                  );
                }}
                style={styles.modalCtrlBtn}
                accessibilityRole="button">
                <Text style={styles.ctrlBtnText}>−</Text>
              </Pressable>
              {coordinates ? (
                <Pressable
                  onPress={() => {
                    haptic.light();
                    modalWebViewRef.current?.injectJavaScript(
                      'if(window.centerOnPin){window.centerOnPin();}true;',
                    );
                  }}
                  style={styles.modalCtrlBtn}
                  accessibilityRole="button">
                  <Text style={styles.ctrlBtnIcon}>🎯</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Botão de Localização Atual na Tela Cheia */}
            <Pressable
              onPress={() => handleUseCurrentLocation(modalWebViewRef.current)}
              disabled={loadingLocation}
              style={styles.modalCurrentLocBtn}
              accessibilityRole="button">
              {loadingLocation ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalCurrentLocText}>📍 Minha localização</Text>
              )}
            </Pressable>
          </View>

          {/* Rodapé com endereço e confirmação */}
          <View style={styles.modalFooter}>
            <View style={styles.modalFooterInfo}>
              <Text style={styles.modalFooterLabel}>Ponto selecionado:</Text>
              <Text style={styles.modalFooterAddress} numberOfLines={2}>
                {address.trim() ||
                  (coordinates
                    ? `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
                    : 'Toque em qualquer lugar do mapa para marcar')}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                haptic.success();
                setIsModalOpen(false);
                setShowMap(true);
                if (coordinates) {
                  webViewRef.current?.injectJavaScript(
                    `if (window.updatePin) { window.updatePin(${coordinates.latitude}, ${coordinates.longitude}); } true;`,
                  );
                }
              }}
              style={styles.modalConfirmBtn}
              accessibilityRole="button">
              <Text style={styles.modalConfirmBtnText}>✓ Confirmar este ponto</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
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
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    minWidth: 100,
    height: 42,
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
  actionBtnActive: {
    borderColor: Brand.accent,
    backgroundColor: 'rgba(255, 107, 74, 0.12)',
  },
  actionBtnText: {
    color: Brand.text,
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnTextActive: {
    color: Brand.accent,
  },
  mapContainer: {
    height: 240,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    position: 'relative',
    marginTop: 4,
  },
  map: {
    flex: 1,
    backgroundColor: '#15151F',
  },
  mapHelpBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 50,
    backgroundColor: 'rgba(11, 11, 18, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapHelpText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  floatingControls: {
    position: 'absolute',
    right: 10,
    top: 10,
    gap: 6,
  },
  ctrlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(18, 18, 28, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  ctrlBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  ctrlBtnIcon: {
    fontSize: 14,
  },
  fullscreenToggleBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(11, 11, 18, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  fullscreenToggleText: {
    color: '#fff',
    fontSize: 11,
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
  modalRoot: {
    flex: 1,
    backgroundColor: Brand.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  modalTitle: {
    color: Brand.text,
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    color: Brand.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  modalDoneBtn: {
    padding: 4,
  },
  modalDoneText: {
    color: Brand.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Brand.surface,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  modalSearchInput: {
    flex: 1,
    height: 40,
    backgroundColor: Brand.surfaceHigh,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: Brand.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  modalSearchActionBtn: {
    height: 40,
    paddingHorizontal: 14,
    backgroundColor: Brand.accent,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalMapContainer: {
    flex: 1,
    position: 'relative',
  },
  modalFloatingControls: {
    position: 'absolute',
    right: 14,
    top: 14,
    gap: 8,
  },
  modalCtrlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(18, 18, 28, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modalCurrentLocBtn: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    backgroundColor: 'rgba(18, 18, 28, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  modalCurrentLocText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalFooter: {
    padding: 16,
    backgroundColor: Brand.surface,
    borderTopWidth: 1,
    borderTopColor: Brand.border,
    gap: 12,
  },
  modalFooterInfo: {
    gap: 2,
  },
  modalFooterLabel: {
    color: Brand.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  modalFooterAddress: {
    color: Brand.text,
    fontSize: 13,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    height: 48,
    backgroundColor: Brand.accent,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
