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
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientButton } from '@/components/form';
import { RatingSelector } from '@/components/rating-selector';
import { ReviewFormSkeleton } from '@/components/skeleton';
import { Brand } from '@/constants/brand';
import { usePlaceDetail, useUserReview } from '@/hooks/use-place-detail';
import { useAuth } from '@/lib/auth';
import { haptic } from '@/lib/haptics';
import { deleteReview, saveReview, type Review } from '@/lib/reviews';

type PhotoAsset = { uri: string; width: number };

export default function ReviewModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const placeId = Array.isArray(id) ? id[0] : id;
  const { user } = useAuth();
  const myReviewQuery = useUserReview(placeId, user?.uid);

  if (myReviewQuery.isPending) {
    return <ReviewFormSkeleton />;
  }

  return (
    <ReviewForm
      key={myReviewQuery.data?.id ?? 'new-review'}
      placeId={placeId}
      existing={myReviewQuery.data}
    />
  );
}

function ReviewForm({ placeId, existing }: { placeId: string; existing?: Review | null }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const placeQuery = usePlaceDetail(placeId);
  const isEditing = !!existing;
  const scrollViewRef = useRef<ScrollView>(null);

  const [rating, setRating] = useState<number>(() => existing?.rating ?? 8.0);
  const [comment, setComment] = useState(() => existing?.comment ?? '');
  const [newPhoto, setNewPhoto] = useState<PhotoAsset | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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
    else router.replace({ pathname: '/place/[id]', params: { id: placeId } });
  }

  async function handlePickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setNewPhoto({ uri: asset.uri, width: asset.width });
      setRemovePhoto(false);
    }
  }

  function handleRemovePhoto() {
    setNewPhoto(null);
    setRemovePhoto(true);
  }

  async function handleSubmit() {
    if (!user || !placeId) return;

    setSaving(true);
    try {
      await saveReview({
        placeId,
        userId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'Avaliador',
        rating,
        comment,
        newPhoto,
        removePhoto,
        existingPhotoUrl: existing?.photoUrl,
        existingThumbUrl: existing?.thumbUrl,
      });

      haptic.success();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['place', placeId] }),
        queryClient.invalidateQueries({ queryKey: ['place-reviews', placeId] }),
        queryClient.invalidateQueries({ queryKey: ['my-review', placeId, user.uid] }),
        queryClient.invalidateQueries({ queryKey: ['places'] }),
      ]);

      handleClose();
    } catch (e) {
      haptic.error();
      setSaving(false);
      Alert.alert('Erro ao salvar', e instanceof Error ? e.message : 'Tente novamente.');
    }
  }

  function handleDelete() {
    if (!user || !placeId) return;

    Alert.alert('Excluir avaliação', 'Tem certeza de que deseja remover sua avaliação?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteReview(placeId, user.uid);
            haptic.success();
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['place', placeId] }),
              queryClient.invalidateQueries({ queryKey: ['place-reviews', placeId] }),
              queryClient.invalidateQueries({ queryKey: ['my-review', placeId, user.uid] }),
              queryClient.invalidateQueries({ queryKey: ['places'] }),
            ]);
            handleClose();
          } catch (e) {
            haptic.error();
            setDeleting(false);
            Alert.alert('Erro ao excluir', e instanceof Error ? e.message : 'Tente novamente.');
          }
        },
      },
    ]);
  }

  const currentPhotoDisplayUri = newPhoto
    ? newPhoto.uri
    : !removePhoto && existing?.photoUrl
      ? existing.photoUrl
      : null;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{isEditing ? 'Editar Avaliação' : 'Nova Avaliação'}</Text>
          {placeQuery.data?.name ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {placeQuery.data.name}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={handleClose} hitSlop={10} accessibilityRole="button" disabled={saving || deleting}>
          <Text style={styles.cancelText}>Cancelar</Text>
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
          showsVerticalScrollIndicator={false}>
          {/* Seletor de Nota 0 a 10 */}
          <RatingSelector value={rating} onChange={setRating} />

          {/* Campo de Opinião */}
          <View style={styles.commentSection}>
            <View style={styles.commentHeader}>
              <Text style={styles.fieldLabel}>Sua opinião (opcional)</Text>
              <Text style={styles.charCount}>{comment.length}/500</Text>
            </View>
            <View style={styles.commentBox}>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Conte o que achou da comida, do ambiente, atendimento ou custo-benefício..."
                placeholderTextColor={Brand.textMuted}
                multiline
                maxLength={500}
                style={styles.commentInput}
                textAlignVertical="top"
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 150, animated: true });
                  }, 180);
                }}
              />
            </View>
          </View>

          {/* Foto da Avaliação (Opcional - Máximo 1 foto) */}
          <View style={styles.photoSection}>
            <Text style={styles.fieldLabel}>Foto do local ou prato (opcional)</Text>

            {currentPhotoDisplayUri ? (
              <View style={styles.photoPreviewCard}>
                <Image source={{ uri: currentPhotoDisplayUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <View style={styles.photoButtons}>
                  <Pressable onPress={handlePickPhoto} style={styles.photoActionBtn} accessibilityRole="button">
                    <Text style={styles.photoActionText}>Trocar foto</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleRemovePhoto}
                    style={[styles.photoActionBtn, { backgroundColor: 'rgba(255,84,112,0.85)' }]}
                    accessibilityRole="button">
                    <Text style={styles.photoActionText}>Remover</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={handlePickPhoto}
                style={styles.photoPickerBtn}
                accessibilityRole="button"
                disabled={saving}>
                <Text style={styles.photoPickerIcon}>📸</Text>
                <Text style={styles.photoPickerText}>Adicionar uma foto</Text>
                <Text style={styles.photoPickerHint}>Será comprimida em alta qualidade automaticamente</Text>
              </Pressable>
            )}
          </View>

          {/* Botão de Salvar */}
          <GradientButton
            title={isEditing ? 'Atualizar Avaliação' : 'Publicar Avaliação'}
            onPress={handleSubmit}
            loading={saving}
          />

          {/* Botão de Excluir (apenas na edição) */}
          {isEditing ? (
            <Pressable
              onPress={handleDelete}
              disabled={deleting || saving}
              style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button">
              {deleting ? (
                <ActivityIndicator color={Brand.danger} size="small" />
              ) : (
                <Text style={styles.deleteBtnText}>Excluir minha avaliação</Text>
              )}
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bg },
  loadingContainer: {
    flex: 1,
    backgroundColor: Brand.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  title: {
    color: Brand.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: Brand.textMuted,
    fontSize: 13,
  },
  cancelText: {
    color: Brand.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
  form: {
    padding: 20,
    gap: 20,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  fieldLabel: {
    color: Brand.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  commentSection: {
    gap: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    color: Brand.textMuted,
    fontSize: 12,
  },
  commentBox: {
    backgroundColor: Brand.surface,
    borderColor: Brand.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    minHeight: 110,
  },
  commentInput: {
    color: Brand.text,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  photoSection: {
    gap: 8,
  },
  photoPreviewCard: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Brand.border,
    position: 'relative',
  },
  photoButtons: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  photoActionBtn: {
    backgroundColor: 'rgba(11, 11, 18, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  photoActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  photoPickerBtn: {
    height: 130,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Brand.border,
    borderStyle: 'dashed',
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoPickerIcon: {
    fontSize: 28,
  },
  photoPickerText: {
    color: Brand.text,
    fontSize: 15,
    fontWeight: '800',
  },
  photoPickerHint: {
    color: Brand.textMuted,
    fontSize: 11,
  },
  deleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: -6,
  },
  deleteBtnText: {
    color: Brand.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});
