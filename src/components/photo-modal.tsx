import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
};

export function PhotoModal({ visible, imageUrl, onClose }: Props) {
  if (!imageUrl) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.backdrop}>
        <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
          <Text style={styles.closeText}>✕ Fechar</Text>
        </Pressable>

        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="contain" />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  closeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  imageContainer: {
    width: '100%',
    height: '75%',
  },
});
