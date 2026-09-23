import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Flashlight,
  FlashlightOff,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius } from '@/constants/theme';
import { decodeQRFromImage } from '@/services/imageQrDecoder';
import { useLanguage } from '@/contexts/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_FRAME_SIZE = Math.min(SCREEN_WIDTH * 0.72, 280);

export interface TicketScannerRef {
  openGallery: () => Promise<void>;
}

interface TicketScannerProps {
  onScanSuccess: (rawPayload: string) => void;
  onNoQrFound: () => void;
  onPhotoPermissionDenied: () => void;
  isScanning: boolean;
}

export const TicketScanner = forwardRef<TicketScannerRef, TicketScannerProps>(
  function TicketScanner(
    { onScanSuccess, onNoQrFound, onPhotoPermissionDenied, isScanning },
    ref
  ) {
    const { t } = useLanguage();
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [enableTorch, setEnableTorch] = useState(false);
    const [isProcessingImage, setIsProcessingImage] = useState(false);

    // Animated green laser scan line
    const laserTranslateY = useSharedValue(0);

    useEffect(() => {
      if (isScanning && !isProcessingImage) {
        laserTranslateY.value = withRepeat(
          withTiming(SCAN_FRAME_SIZE - 6, {
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        );
      } else {
        cancelAnimation(laserTranslateY);
      }
      return () => {
        cancelAnimation(laserTranslateY);
      };
    }, [isScanning, isProcessingImage]);

    const laserStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: laserTranslateY.value }],
    }));

    const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Medium) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(style);
      }
    };

    const handleBarcodeScanned = (result: BarcodeScanningResult) => {
      if (!isScanning || isProcessingImage) return;
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      onScanSuccess(result.data);
    };

    const handleOpenGallery = async () => {
      triggerHaptic();
      try {
        // Request photo library permissions gracefully on user tap
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
          onPhotoPermissionDenied();
          return;
        }

        // Launch system image library
        const pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 1,
        });

        if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
          return;
        }

        const selectedUri = pickerResult.assets[0].uri;
        setIsProcessingImage(true);

        const decodedPayload = await decodeQRFromImage(selectedUri);
        setIsProcessingImage(false);

        if (!decodedPayload) {
          onNoQrFound();
          return;
        }

        onScanSuccess(decodedPayload);
      } catch (error) {
        setIsProcessingImage(false);
        console.warn('Error reading QR from gallery image:', error);
        onNoQrFound();
      }
    };

    useImperativeHandle(ref, () => ({
      openGallery: handleOpenGallery,
    }));

    // 1. Camera permission loading state
    if (!cameraPermission) {
      return (
        <View style={styles.centerContainer}>
          <RefreshCw size={28} color="#2E7D32" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      );
    }

    // 2. Camera permission denied state
    if (!cameraPermission.granted) {
      return (
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconCircle}>
            <AlertCircle size={36} color="#DC2626" />
          </View>
          <Text style={styles.permissionTitle}>{t('scanner.permissionRequired')}</Text>
          <Text style={styles.permissionDesc}>
            {t('scanner.permissionDesc')}
          </Text>

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={() => requestCameraPermission()}
          >
            <Camera size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>{t('scanner.grantPermission')}</Text>
          </Pressable>

          {/* Gallery fallback option when camera is not granted */}
          <View style={styles.galleryFallbackContainer}>
            <Text style={styles.galleryFallbackLabel}>
              {t('scanner.noQrFoundDesc')}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.galleryQuickBtn, pressed && styles.pressed]}
              onPress={handleOpenGallery}
            >
              <ImageIcon size={18} color="#2E7D32" />
              <Text style={styles.galleryQuickBtnText}>{t('scanner.openGallery')}</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    // 3. Active camera view with viewfinder frame
    return (
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={enableTorch}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={isScanning && !isProcessingImage ? handleBarcodeScanned : undefined}
        />

        {/* Semi-transparent Mask with Cutout Viewfinder */}
        <View style={styles.overlayContainer}>
          {/* Top Dark Bar */}
          <View style={styles.overlaySide} />

          {/* Center Row */}
          <View style={styles.centerRow}>
            <View style={styles.overlaySide} />

            {/* Viewfinder Frame */}
            <View style={[styles.scanFrame, { width: SCAN_FRAME_SIZE, height: SCAN_FRAME_SIZE }]}>
              {/* 4 Corner Brackets */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />

              {/* Moving Laser Line */}
              {isScanning && !isProcessingImage && (
                <Animated.View style={[styles.laserLine, laserStyle]} />
              )}

              {/* Image Processing Loader Overlay */}
              {isProcessingImage && (
                <View style={styles.processingFrameOverlay}>
                  <ActivityIndicator size="large" color="#4ADE80" />
                  <Text style={styles.processingFrameText}>{t('scanner.processingImage')}</Text>
                </View>
              )}
            </View>

            <View style={styles.overlaySide} />
          </View>

          {/* Bottom Dark Bar */}
          <View style={[styles.overlaySide, styles.bottomOverlay]}>
            <Text style={styles.instructionText}>{t('scanner.alignFrame')}</Text>

            {/* Torch & Gallery Action Buttons */}
            <View style={styles.controlButtonsRow}>
              {/* Flash Button */}
              <Pressable
                style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
                onPress={() => {
                  triggerHaptic();
                  setEnableTorch((prev) => !prev);
                }}
                accessibilityLabel={enableTorch ? t('scanner.flashOff') : t('scanner.flash')}
              >
                {enableTorch ? (
                  <FlashlightOff size={20} color="#FFFFFF" />
                ) : (
                  <Flashlight size={20} color="#FFFFFF" />
                )}
                <Text style={styles.controlBtnText}>
                  {enableTorch ? t('scanner.flashOff') : t('scanner.flash')}
                </Text>
              </Pressable>

              {/* Gallery Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.controlBtn,
                  styles.galleryControlBtn,
                  pressed && styles.pressed,
                ]}
                onPress={handleOpenGallery}
                accessibilityLabel={t('scanner.gallery')}
              >
                <ImageIcon size={20} color="#FFFFFF" />
                <Text style={styles.controlBtnText}>{t('scanner.gallery')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: '#4B5563',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: '#FFFFFF',
  },
  permissionIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  permissionTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: '#111827',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  permissionDesc: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.button,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
  },
  galleryFallbackContainer: {
    marginTop: Spacing.xxl,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: Spacing.lg,
  },
  galleryFallbackLabel: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: '#6B7280',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  galleryQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  galleryQuickBtnText: {
    color: '#2E7D32',
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanFrame: {
    position: 'relative',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#4ADE80',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 6,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 6,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 6,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 6,
  },
  laserLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 3,
    backgroundColor: '#4ADE80',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 4,
    borderRadius: 1.5,
  },
  processingFrameOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: 8,
  },
  processingFrameText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FontFamily.medium,
    textAlign: 'center',
  },
  bottomOverlay: {
    alignItems: 'center',
    paddingTop: Spacing.base,
    paddingHorizontal: Spacing.lg,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FontFamily.medium,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  controlButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginBottom: Spacing.sm,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  galleryControlBtn: {
    backgroundColor: 'rgba(46, 125, 50, 0.4)',
    borderColor: 'rgba(134, 239, 172, 0.5)',
  },
  controlBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
