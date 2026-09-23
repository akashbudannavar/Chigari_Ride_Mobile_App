import { Platform } from 'react-native';
import LiveTrackingMapNative from './LiveTrackingMap.native';
import LiveTrackingMapWeb from './LiveTrackingMap.web';
export type { LiveTrackingMapRef } from './LiveTrackingMap.native';

export const LiveTrackingMap = Platform.OS === 'web' ? LiveTrackingMapWeb : LiveTrackingMapNative;

export default LiveTrackingMap;
