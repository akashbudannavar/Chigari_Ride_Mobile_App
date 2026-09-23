import { Platform } from 'react-native';
import { scanFromURLAsync } from 'expo-camera';
import jsQR from 'jsqr';

/**
 * Decodes a QR code payload from an image URI.
 * - On iOS/Android: Uses native hardware/MLKit via expo-camera `scanFromURLAsync`.
 * - On Web / Fallback: Uses off-screen HTML canvas with `jsQR`.
 *
 * @param imageUri Local or remote URI of the image
 * @returns Decoded QR string or null if no QR code was found
 */
export async function decodeQRFromImage(imageUri: string): Promise<string | null> {
  if (!imageUri || typeof imageUri !== 'string') {
    return null;
  }

  // 1. On Native mobile platforms, use expo-camera scanFromURLAsync
  if (Platform.OS !== 'web') {
    try {
      const results = await scanFromURLAsync(imageUri, ['qr']);
      if (results && Array.isArray(results) && results.length > 0) {
        for (const res of results) {
          if (res && res.data && typeof res.data === 'string' && res.data.trim()) {
            return res.data.trim();
          }
        }
      }
    } catch (nativeError) {
      console.warn('Native scanFromURLAsync error:', nativeError);
    }
  }

  // 2. On Web or as browser fallback, use HTML Canvas + jsQR
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const result = await new Promise<string | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const width = img.naturalWidth || img.width;
            const height = img.naturalHeight || img.height;

            if (width <= 0 || height <= 0) {
              resolve(null);
              return;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(null);
              return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, width, height);
            const qrResult = jsQR(imageData.data, width, height, {
              inversionAttempts: 'attemptBoth',
            });

            if (qrResult && qrResult.data && qrResult.data.trim()) {
              resolve(qrResult.data.trim());
            } else {
              resolve(null);
            }
          } catch (canvasError) {
            console.warn('Canvas decoding error:', canvasError);
            resolve(null);
          }
        };

        img.onerror = () => {
          resolve(null);
        };

        img.src = imageUri;
      });

      if (result) {
        return result;
      }
    } catch (webError) {
      console.warn('Web QR decode error:', webError);
    }
  }

  return null;
}
