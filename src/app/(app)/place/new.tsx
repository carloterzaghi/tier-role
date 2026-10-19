import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field, GradientButton } from '@/components/form';
import { LocationPicker, type Coordinates } from '@/components/location-picker';
import { TagPicker } from '@/components/tag-picker';
import { Brand } from '@/constants/brand';
import { useTags } from '@/hooks/use-places';
import { useAuth } from '@/lib/auth';
import { haptic } from '@/lib/haptics';
import { createPlace } from '@/lib/place-service';

type Photo = { uri: string; width: number };

/** Volta se houver tela anterior; senão (ex.: app recarregado nesta tela) vai para a Home. */
function closeScreen() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function NewPlace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tags = useTags();
  const scrollViewRef = useRef<ScrollView>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Monitora a altura do teclado para garantir espaço de rolagem e visibilidade dos inputs
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
    }
  }

  async function submit() {
    if (!user) return;
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
      await createPlace({
        userId: user.uid,
        name,
        address,
        description,
        tags: selectedTags,
        photo,
        coordinates,
      });
      haptic.success();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['places'] }),
        queryClient.invalidateQueries({ queryKey: ['tags'] }),
      ]);
      closeScreen();
    } catch (e) {
      haptic.error();
      setSaving(false);
      Alert.alert('Não foi possível salvar', e instanceof Error ? e.message : 'Tente novamente.');
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Novo local</Text>
        <Pressable onPress={closeScreen} hitSlop={10} accessibilityRole="button" disabled={saving}>
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
          <Pressable onPress={pickPhoto} style={styles.photoBox} accessibilityRole="button" disabled={saving}>
            {photo ? (
              <>
                <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <View style={styles.photoEdit}>
                  <Text style={styles.photoEditText}>Trocar foto</Text>
                </View>
              </>
            ) : (
              <View style={styles.photoEmpty}>
                <Text style={styles.photoIcon}>📷</Text>
                <Text style={styles.photoText}>Adicionar foto de capa</Text>
                <Text style={styles.photoHint}>Opcional · será comprimida automaticamente</Text>
              </View>
            )}
          </Pressable>

          <Field label="Nome do local *" value={name} onChangeText={setName} placeholder="Ex.: Pizzaria do Zé" maxLength={80} />
          <Field label="Endereço" value={address} onChangeText={setAddress} placeholder="Rua, número, bairro" maxLength={140} />

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
              // Garante que o campo de descrição role para cima e fique 100% visível
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 180);
            }}
          />

          <TagPicker existing={tags.data ?? []} selected={selectedTags} onChange={setSelectedTags} />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <GradientButton title="Criar local" onPress={submit} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { color: Brand.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  cancel: { color: Brand.textMuted, fontSize: 15, fontWeight: '700' },
  form: { padding: 20, gap: 18, width: '100%', maxWidth: 560, alignSelf: 'center' },
  photoBox: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Brand.surface,
    borderWidth: 1.5,
    borderColor: Brand.border,
    borderStyle: 'dashed',
  },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoIcon: { fontSize: 36 },
  photoText: { color: Brand.text, fontSize: 16, fontWeight: '800' },
  photoHint: { color: Brand.textMuted, fontSize: 12 },
  photoEdit: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(11,11,18,0.78)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  photoEditText: { color: Brand.text, fontSize: 12, fontWeight: '800' },
  error: {
    color: Brand.danger,
    fontSize: 14,
    backgroundColor: 'rgba(255,84,112,0.12)',
    padding: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
