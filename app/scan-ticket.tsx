import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Platform,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, AlertTriangle, RefreshCw, X, Image as ImageIcon } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/ui/Text';
import { Colors, FontFamily, Spacing, Radius } from '@/constants/theme';
import { TicketScanner, type TicketScannerRef } from '@/components/TicketScanner';
import { validateTicketQR } from '@/services/ticketValidation';
import { saveScannedTicket } from '@/services/ticketScanner';
import { useLanguage } from '@/contexts/LanguageContext';

interface ScannerDialogState {
  type: 'invalid_ticket' | 'no_qr_found' | 'permission_denied';
  title: string;
  message: string;
}

export default function ScanTicketScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const scannerRef = useRef<TicketScannerRef>(null);

  const [isScanning, setIsScanning] = useState(true);
  const [dialogState, setDialogState] = useState<ScannerDialogState | null>(null);

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(style);
    }
  };

  const handleBack = () => {
    triggerHaptic();
    router.back();
  };

  const handleScanSuccess = useCallback(async (rawPayload: string) => {
    setIsScanning(false);
    const result = validateTicketQR(rawPayload);

    if (result.success) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // Save scanned ticket to storage
      await saveScannedTicket(result.ticket);

      // Navigate to ticket-result screen with ticket payload
      router.push({
        pathname: '/ticket-result' as any,
        params: {
          ticketJson: JSON.stringify(result.ticket),
        },
      });
    } else {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setDialogState({
        type: 'invalid_ticket',
        title: t('ticketResult.invalidPass'),
        message: result.error,
      });
    }
  }, [t]);

  const handleNoQrFound = useCallback(() => {
    setIsScanning(false);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setDialogState({
      type: 'no_qr_found',
      title: t('scanner.noQrFound'),
      message: t('scanner.noQrFoundDesc'),
    });
  }, [t]);

  const handlePhotoPermissionDenied = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setDialogState({
      type: 'permission_denied',
      title: t('scanner.photoPermissionNeeded'),
      message: t('scanner.photoPermissionDesc'),
    });
  }, [t]);

  const handleDismissDialog = () => {
    triggerHaptic();
    setDialogState(null);
    setIsScanning(true);
  };

  const handleChooseAnotherImage = () => {
    triggerHaptic();
    setDialogState(null);
    setIsScanning(true);
    // Re-trigger the gallery picker
    setTimeout(() => {
      scannerRef.current?.openGallery();
    }, 150);
  };

  return (
    <Screen backgroundColor="#000000" safeAreaTop={false} safeAreaBottom={false}>
      <View style={styles.container}>
        {/* ─── Top Header Bar ─── */}
        <View style={[styles.headerBar, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={handleBack}
            accessibilityLabel={t('common.back')}
          >
            <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>

          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>{t('scanner.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('scanner.subtitle')}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={handleBack}
            accessibilityLabel={t('common.cancel')}
          >
            <X size={22} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* ─── Camera Scanning Viewfinder ─── */}
        <View style={styles.cameraContainer}>
          <TicketScanner
            ref={scannerRef}
            onScanSuccess={handleScanSuccess}
            onNoQrFound={handleNoQrFound}
            onPhotoPermissionDenied={handlePhotoPermissionDenied}
            isScanning={isScanning}
          />
        </View>

        {/* ─── Bottom Footer Bar ─── */}
        <View style={[styles.footerBar, { paddingBottom: insets.bottom + Spacing.base }]}>
          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
            onPress={handleBack}
          >
            <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
          </Pressable>
        </View>

        {/* ─── Scanner Feedback Modal (Invalid QR / No QR / Permission) ─── */}
        <Modal
          visible={dialogState !== null}
          transparent
          animationType="fade"
          onRequestClose={handleDismissDialog}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View
                style={[
                  styles.modalIconCircle,
                  dialogState?.type === 'no_qr_found' && styles.modalIconCircleWarning,
                ]}
              >
                <AlertTriangle
                  size={32}
                  color={dialogState?.type === 'no_qr_found' ? '#D97706' : '#DC2626'}
                  strokeWidth={2.2}
                />
              </View>

              <Text style={styles.modalTitle}>{dialogState?.title}</Text>
              <Text style={styles.modalMessage}>{dialogState?.message}</Text>

              <View style={styles.modalActionsRow}>
                {dialogState?.type === 'no_qr_found' ? (
                  <>
                    <Pressable
                      style={({ pressed }) => [styles.modalCancelBtn, pressed && styles.pressed]}
                      onPress={handleDismissDialog}
                    >
                      <Text style={styles.modalCancelBtnText}>{t('common.cancel')}</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [styles.modalPrimaryBtn, pressed && styles.pressed]}
                      onPress={handleChooseAnotherImage}
                    >
                      <ImageIcon size={16} color="#FFFFFF" />
                      <Text style={styles.modalPrimaryBtnText}>{t('scanner.tryAnotherImage')}</Text>
                    </Pressable>
                  </>
                ) : dialogState?.type === 'permission_denied' ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalPrimaryBtn,
                      { flex: 1 },
                      pressed && styles.pressed,
                    ]}
                    onPress={handleDismissDialog}
                  >
                    <Text style={styles.modalPrimaryBtnText}>{t('common.close')}</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      style={({ pressed }) => [styles.modalCancelBtn, pressed && styles.pressed]}
                      onPress={handleBack}
                    >
                      <Text style={styles.modalCancelBtnText}>{t('common.cancel')}</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [styles.modalPrimaryBtn, pressed && styles.pressed]}
                      onPress={handleDismissDialog}
                    >
                      <RefreshCw size={16} color="#FFFFFF" />
                      <Text style={styles.modalPrimaryBtnText}>{t('scanner.scanAgain')}</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FontFamily.bold,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: FontFamily.regular,
    marginTop: 2,
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
  },
  footerBar: {
    paddingTop: Spacing.base,
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  modalIconCircleWarning: {
    backgroundColor: '#FEF3C7',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: '#111827',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  modalCancelBtnText: {
    color: '#374151',
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
  },
  modalPrimaryBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.button,
    backgroundColor: '#2E7D32',
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
