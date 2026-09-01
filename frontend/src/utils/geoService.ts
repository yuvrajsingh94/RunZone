/**
 * Production-grade Geolocation Service for RunZone
 * Handles browser Geolocation API with:
 * - Secure Context (HTTPS) verification
 * - Dual-pass resolution (High Accuracy GPS -> Low Accuracy Network fallback)
 * - Hard safety timeout to prevent infinite loading states
 * - Actionable, user-facing error classification
 */

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  speed?: number | null;
  timestamp: number;
}

export type GeolocationErrorCode =
  | 'NOT_SUPPORTED'
  | 'INSECURE_CONTEXT'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface GeolocationCustomError {
  code: GeolocationErrorCode;
  message: string;
  userMessage: string;
  actionableHint: string;
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return true;
  // Localhost is considered secure context by browsers
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return true;
  }
  return window.isSecureContext === true || window.location.protocol === 'https:';
}

/**
 * Maps standard GeolocationPositionError to a friendly, actionable custom error
 */
export function mapGeolocationError(error: any): GeolocationCustomError {
  if (!error) {
    return {
      code: 'UNKNOWN',
      message: 'Unknown location error',
      userMessage: 'Could not determine location.',
      actionableHint: 'Please click "Locate Me" to try again.',
    };
  }

  // Handle standard GeolocationPositionError codes
  switch (error.code) {
    case 1: // PERMISSION_DENIED
      return {
        code: 'PERMISSION_DENIED',
        message: 'User denied geolocation permission',
        userMessage: 'Location permission was denied.',
        actionableHint: 'Click the lock or settings icon in your browser address bar to allow location access for RunZone.',
      };
    case 2: // POSITION_UNAVAILABLE
      return {
        code: 'POSITION_UNAVAILABLE',
        message: error.message || 'Position unavailable from device',
        userMessage: 'GPS signal is currently unavailable.',
        actionableHint: 'Check if device Location Services are enabled, or try moving outdoors.',
      };
    case 3: // TIMEOUT
      return {
        code: 'TIMEOUT',
        message: 'Location acquisition timed out',
        userMessage: 'Location request timed out.',
        actionableHint: 'GPS took too long to respond. Click "Locate Me" to retry.',
      };
    default:
      return {
        code: 'UNKNOWN',
        message: error.message || 'Unexpected location error',
        userMessage: error.message || 'Failed to acquire location.',
        actionableHint: 'Please refresh the page or click "Locate Me" to retry.',
      };
  }
}

interface AcquireLocationOptions {
  enableHighAccuracy?: boolean;
  timeoutMs?: number;
  maximumAgeMs?: number;
}

/**
 * Low-level promise wrapper around navigator.geolocation.getCurrentPosition with a guaranteed safety timeout
 */
function requestPositionOnce(options: AcquireLocationOptions): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject({
        code: 'NOT_SUPPORTED',
        message: 'Geolocation is not supported by your browser',
        userMessage: 'Geolocation is not supported by this browser.',
        actionableHint: 'Please use a modern browser like Chrome, Safari, or Edge.',
      } as GeolocationCustomError);
      return;
    }

    if (!isSecureContext()) {
      reject({
        code: 'INSECURE_CONTEXT',
        message: 'Geolocation requires a secure HTTPS connection',
        userMessage: 'Location requires a secure HTTPS connection.',
        actionableHint: 'Please access RunZone over HTTPS (https://...).',
      } as GeolocationCustomError);
      return;
    }

    const timeout = options.timeoutMs ?? 7000;
    let isSettled = false;

    // Hard safety timer to GUARANTEE we never hang forever if browser driver freezes
    const safetyTimer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        reject({
          code: 'TIMEOUT',
          message: `Browser location request exceeded safety timeout of ${timeout}ms`,
          userMessage: 'Location request timed out.',
          actionableHint: 'GPS took too long to respond. Click "Locate Me" to retry.',
        } as GeolocationCustomError);
      }
    }, timeout + 500);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(safetyTimer);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          });
        }
      },
      (error) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(safetyTimer);
          reject(mapGeolocationError(error));
        }
      },
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: timeout,
        maximumAge: options.maximumAgeMs ?? 0,
      }
    );
  });
}

/**
 * Acquire user location with Dual-Pass resolution:
 * 1. Tries high accuracy (GPS hardware) first.
 * 2. If it times out or is unavailable (e.g. desktop/laptop without GPS chip), automatically falls back to low accuracy (Wi-Fi/IP location).
 * 3. Never hangs or leaves loading state unfinished.
 */
export async function acquireLiveLocation(
  onProgress?: (stage: 'requesting' | 'fallback_low_accuracy') => void
): Promise<GeolocationResult> {
  if (onProgress) onProgress('requesting');

  try {
    // Pass 1: High Accuracy GPS (6000ms timeout)
    return await requestPositionOnce({
      enableHighAccuracy: true,
      timeoutMs: 6000,
      maximumAgeMs: 5000,
    });
  } catch (err: any) {
    // If user explicitly denied permission, don't retry low accuracy - fail fast
    if (err.code === 'PERMISSION_DENIED' || err.code === 'NOT_SUPPORTED' || err.code === 'INSECURE_CONTEXT') {
      throw err;
    }

    // Pass 2: Fallback to standard / network location (6000ms timeout)
    if (onProgress) onProgress('fallback_low_accuracy');
    try {
      return await requestPositionOnce({
        enableHighAccuracy: false,
        timeoutMs: 6000,
        maximumAgeMs: 60000, // Allow recent cached position
      });
    } catch (fallbackErr: any) {
      throw fallbackErr;
    }
  }
}
