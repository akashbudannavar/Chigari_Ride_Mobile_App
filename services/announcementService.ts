import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import type { BRTSStop } from '../types/transit';

export type AnnouncementType =
  | 'departure'
  | 'next_stop'
  | 'station_reached'
  | 'destination_approaching'
  | 'destination_reached'
  | 'bus_arrived_boarding';

export interface AnnouncementPayload {
  type: AnnouncementType;
  stationName: string;
  busNumber: string;
  language: 'en' | 'kn' | 'hi';
  destinationName?: string;
  stopsRemaining?: number;
}

/**
 * Returns a clean, passenger-friendly localized name for a station.
 */
export function getCleanStopName(stop: BRTSStop | { name: string; kannadaName?: string }, lang: 'en' | 'kn' | 'hi' = 'en'): string {
  if (lang === 'kn' && stop.kannadaName) {
    const raw = stop.kannadaName.split('/')[0].trim();
    return raw;
  }
  return stop.name.split('/')[0].trim();
}

/**
 * Generates spoken public-transport announcement text matching official standards.
 */
export function generateAnnouncementText(payload: AnnouncementPayload): string {
  const { type, stationName, busNumber, language, destinationName = '', stopsRemaining = 0 } = payload;

  if (language === 'kn') {
    switch (type) {
      case 'departure':
        return `ಚಿಗರಿ ರೈಡ್‌ಗೆ ಸುಸ್ವಾಗತ. ನೀವು ಈಗ ${stationName} ನಿಲ್ದಾಣದಿಂದ ಹೊರಡುತ್ತಿದ್ದೀರಿ. ದಯವಿಟ್ಟು ಕುಳಿತುಕೊಳ್ಳಿ ಮತ್ತು ನಿಮ್ಮ ಪ್ರಯಾಣವನ್ನು ಆನಂದಿಸಿ.`;
      case 'bus_arrived_boarding':
        return `${busNumber} ಬಸ್ ${stationName} ನಿಲ್ದಾಣಕ್ಕೆ ತಲುಪಿದೆ. ದಯವಿಟ್ಟು ಬಸ್ ಹತ್ತಿ.`;
      case 'station_reached':
        return `ನಾವು ${stationName} ತಲುಪಿದ್ದೇವೆ.`;
      case 'next_stop':
        return `ಮುಂದಿನ ನಿಲ್ದಾಣ ${stationName}.`;
      case 'destination_approaching':
        return `ಮುಂದಿನ ನಿಲ್ದಾಣವು ನಿಮ್ಮ ಅಂತಿಮ ತಲುಪುವ ಸ್ಥಳ, ${stationName}.`;
      case 'destination_reached':
        return `ನಾವು ನಿಮ್ಮ ಅಂತಿಮ ತಲುಪುವ ಸ್ಥಳವಾದ ${stationName} ಅನ್ನು ತಲುಪಿದ್ದೇವೆ. ಬಸ್‌ನಿಂದ ಇಳಿಯುವ ಮುನ್ನ ನಿಮ್ಮ ಎಲ್ಲಾ ವಸ್ತುಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.`;
    }
  }

  if (language === 'hi') {
    switch (type) {
      case 'departure':
        return `चिगरी राइड में आपका स्वागत है। आप अब ${stationName} से रवाना हो रहे हैं। कृपया बैठे रहें और अपनी यात्रा का आनंद लें।`;
      case 'bus_arrived_boarding':
        return `बस ${busNumber} ${stationName} पर पहुंच गई है। कृपया बस में सवार हों।`;
      case 'station_reached':
        return `हम ${stationName} पहुंच चुके हैं।`;
      case 'next_stop':
        return `अगला स्टॉप ${stationName} है।`;
      case 'destination_approaching':
        return `अगला स्टॉप आपका अंतिम गंतव्य, ${stationName} होगा।`;
      case 'destination_reached':
        return `हम आपके अंतिम गंतव्य, ${stationName} पहुँच चुके हैं। बस से उतरने से पहले कृपया अपने सभी सामान की जाँच कर लें।`;
    }
  }

  // Default: English
  switch (type) {
    case 'departure':
      return `Welcome aboard Chigari Ride. You are now departing from ${stationName}. Please stay seated and enjoy your journey.`;
    case 'bus_arrived_boarding':
      return `${busNumber} has arrived at ${stationName}. Please enter the bus.`;
    case 'station_reached':
      return `We have arrived at ${stationName}.`;
    case 'next_stop':
      return `The next stop is ${stationName}.`;
    case 'destination_approaching':
      return `The next stop will be your final destination, ${stationName}.`;
    case 'destination_reached':
      return `We have arrived at ${stationName}, your final destination. Please check that you have all your belongings before leaving the bus.`;
  }
}

// Track recent announcements to prevent duplicate utterances and queue stalls
let lastSpokenText = '';
let lastSpokenTimestamp = 0;

/**
 * Speaks text promptly using expo-speech on native devices, with web SpeechSynthesis fallback.
 * Operates non-blocking with zero artificial delay and smart deduplication.
 */
export async function speakAnnouncement(
  text: string,
  language: 'en' | 'kn' | 'hi' = 'en',
): Promise<void> {
  const cleanText = text.trim();
  if (!cleanText) return;

  const now = Date.now();
  // Prevent duplicate announcements of the identical text within 4 seconds
  if (cleanText === lastSpokenText && now - lastSpokenTimestamp < 4000) {
    return;
  }
  lastSpokenText = cleanText;
  lastSpokenTimestamp = now;

  try {
    let speechLang = 'en-IN';
    if (language === 'kn') {
      speechLang = 'kn-IN';
    } else if (language === 'hi') {
      speechLang = 'hi-IN';
    }

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = speechLang;
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
      return;
    }

    // Native expo-speech: Stop previous speech non-blocking, start promptly
    Speech.stop().catch(() => {});
    Speech.speak(cleanText, {
      language: speechLang,
      pitch: 1.0,
      rate: 1.0,
      onError: (err) => {
        console.warn('[AnnouncementService] TTS speech warning:', err);
      },
    });
  } catch (error) {
    console.warn('[AnnouncementService] Failed to dispatch announcement audio:', error);
  }
}

/**
 * Immediately cancels and silences all current and queued announcements.
 */
export async function stopAllAnnouncements(): Promise<void> {
  lastSpokenText = '';
  lastSpokenTimestamp = 0;
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }
    Speech.stop().catch(() => {});
  } catch (error) {
    console.warn('[AnnouncementService] Failed to stop speech:', error);
  }
}

