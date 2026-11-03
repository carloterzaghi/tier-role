import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field, GradientButton } from '@/components/form';
import { LocationPicker, type Coordinates } from '@/components/location-picker';
import { TagPicker } from '@/components/tag-picker';
import { Brand } from '@/constants/brand';
import { usePlaceDetail } from '@/hooks/use-place-detail';
import { useTags } from '@/hooks/use-places';
import { useAuth } from '@/lib/auth';
import { haptic } from '@/lib/haptics';
import { updatePlace } from '@/lib/place-service';
import type { Place } from '@/lib/places';

type PhotoAsset = { uri: string; width: number };

export default function EditPlaceModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const placeId = Array.isArray(id) ? id[0] : id;
  const { user } = useAuth();
  const placeQuery = usePlaceDetail(placeId);

  if (placeQuery.isPending) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={Brand.accent} />
      </SafeAreaView>
    );
  }

  const place = placeQuery.data;

  if (!place) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top', 'bottom']}>
        <Text style={styles.errorEmoji}>🔍</Text>
        <Text style={styles.errorTitle}>Local não encontrado</Text>
        <Text style={styles.errorSubtitle}>Ele pode ter sido removido ou o identificador é inválido.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
          <Text style={styles.backBtnText}>Voltar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!user || place.createdBy !== user.uid) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top', 'bottom']}>
        <Text style={styles.errorEmoji}>🔒</Text>
        <Text style={styles.errorTitle}>Acesso restrito</Text>
        <Text style={styles.errorSubtitle}>Apenas o usuário que criou este local pode editá-lo.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
          <Text style={styles.backBtnText}>Voltar</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return <EditPlaceForm key={place.id} place={place} userId={user.uid} />;
}

function EditPlaceForm({ place, userId }: { place: Place; userId: string }) {
  const queryClient = useQueryClient();
  const tags = useTags();
  const scrollViewRef = useRef<ScrollViewInstance>(null);

  const [name, setName] = useState(() => place.name);
  const [address, setAddress] = useState(() => place.address);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(() =>
    place.latitude && place.longitude
      ? { latitude: place.latitude, longitude: place.longitude }
      : null,
  );
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [description, setDescription] = useState(() => place.description);
  const [selectedTags, setSelectedTags] = useState<string[]>(() => place.tags);
  const [photo, setPhoto] = useState<PhotoAsset | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const currentDisplayPhotoUri = photo?.uri ?? (!removePhoto ? place.coverUrl : null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  function handleClose() {
    if (router.canGoBack()) router.back();
    else router.replace(`/place/${place.id}`);
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhoto({ uri: asset.uri, width: asset.width });
      setRemovePhoto(false);
    }
  }

  function handleRemovePhoto() {
    haptic.selection();
    setPhoto(null);
    setRemovePhoto(true);
  }

  async function submit() {
    if (name.trim().length < 2) {
      setError('Informe o nome do local.');
      return;
    }
    if (selectedTags.length === 0) {
      setError('Adicione pelo menos uma tag.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updatePlace({
        placeId: place.id,
        userId,
        name,
        address,
        description,
        tags: selectedTags,
        photo,
        removePhoto,
        coordinates,
      });
      haptic.success();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['place', place.id] }),
        queryClient.invalidateQueries({ queryKey: ['places'] }),
        queryClient.invalidateQueries({ queryKey: ['tags'] }),
      ]);
      handleClose();
    } catch (e) {
      haptic.error();
      setSaving(false);
      Alert.alert('Não foi possível salvar', e instanceof Error ? e.message : 'Tente novamente.');
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Editar local</Text>
        <Pressable onPress={handleClose} hitSlop={10} accessibilityRole="button" disabled={saving}>
          <Text style={styles.cancel}>Cancelar</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.form,
            { paddingBottom: Math.max(keyboardHeight + 60, 40) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={true}
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}>
          {/* Seção da foto de capa */}
          {currentDisplayPhotoUri ? (
            <View style={styles.photoBoxFilled}>
              <Image source={{ uri: currentDisplayPhotoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <View style={styles.photoActions}>
                <Pressable
                  onPress={pickPhoto}
                  style={styles.photoActionBtn}
                  disabled={saving}
                  accessibilityRole="button">
                  <Text style={styles.photoActionText}>Trocar foto</Text>
                </Pressable>
                <Pressable
                  onPress={handleRemovePhoto}
                  style={[styles.photoActionBtn, styles.photoRemoveBtn]}
                  disabled={saving}
                  accessibilityRole="button">
                  <Text style={[styles.photoActionText, styles.photoRemoveText]}>Remover</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={pickPhoto}
              style={styles.photoBoxEmpty}
              accessibilityRole="button"
              disabled={saving}>
              <View style={styles.photoEmptyContent}>
                <Text style={styles.photoIcon}>📷</Text>
                <Text style={styles.photoText}>Adicionar foto de capa</Text>
                <Text style={styles.photoHint}>Opcional · será comprimida automaticamente</Text>
              </View>
            </Pressable>
          )}

          <Field
            label="Nome do local *"
            value={name}
            onChangeText={setName}
            placeholder="Ex.: Pizzaria do Zé"
            maxLength={80}
          />

          <Field
            label="Endereço"
            value={address}
            onChangeText={setAddress}
            placeholder="Rua, número, bairro"
            maxLength={140}
          />

          <LocationPicker
            address={address}
            onAddressChange={setAddress}
            coordinates={coordinates}
            onCoordinatesChange={setCoordinates}
            onMapTouchStart={() => setScrollEnabled(false)}
            onMapTouchEnd={() => setScrollEnabled(true)}
          />

          <Field
            label="Descrição"
            value={description}
            onChangeText={setDescription}
            placeholder="O que torna esse lugar especial?"
            multiline
            maxLength={400}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 180);
            }}
          />

          <TagPicker
            existing={tags.data ?? []}
            selected={selectedTags}
            onChange={setSelectedTags}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <GradientButton title="Salvar alterações" onPress={submit} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bg },
  centerContainer: {
    flex: 1,
    backgroundColor: Brand.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { color: Brand.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  cancel: { color: Brand.textMuted, fontSize: 15, fontWeight: '700' },
  form: { padding: 20, gap: 18, width: '100%', maxWidth: 560, alignSelf: 'center' },
  photoBoxFilled: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Brand.surface,
  },
  photoBoxEmpty: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Brand.surface,
    borderWidth: 1.5,
    borderColor: Brand.border,
    borderStyle: 'dashed',
  },
  photoEmptyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoIcon: { fontSize: 36 },
  photoText: { color: Brand.text, fontSize: 16, fontWeight: '800' },
  photoHint: { color: Brand.textMuted, fontSize: 12 },
  photoActions: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  photoActionBtn: {
    backgroundColor: 'rgba(11,11,18,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  photoRemoveBtn: {
    backgroundColor: 'rgba(255,84,112,0.85)',
  },
  photoActionText: { color: Brand.text, fontSize: 12, fontWeight: '800' },
  photoRemoveText: { color: '#FFFFFF' },
  error: {
    color: Brand.danger,
    fontSize: 14,
    backgroundColor: 'rgba(255,84,112,0.12)',
    padding: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  errorEmoji: { fontSize: 44, marginBottom: 4 },
  errorTitle: { color: Brand.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  errorSubtitle: { color: Brand.textMuted, fontSize: 14, textAlign: 'center', maxWidth: 300 },
  backBtn: {
    marginTop: 12,
    backgroundColor: Brand.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: { color: Brand.text, fontSize: 14, fontWeight: '700' },
});

