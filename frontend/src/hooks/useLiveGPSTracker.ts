import { useState, useEffect, useRef, useCallback } from 'react';
import { mapGeolocationError, isSecureContext } from '../utils/geoService';

export interface GPSPoint {
  lat: number;
  lng: number;
  altitude?: number;
  speed?: number;
  timestamp: number;
}

export type TrackerStatus = 'idle' | 'tracking' | 'paused' | 'finished';

// Haversine formula to compute great-circle distance between two GPS coordinates in kilometers
function computeHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useLiveGPSTracker(athleteWeightKg: number = 70) {
  const [status, setStatus] = useState<TrackerStatus>('idle');
  const [coords, setCoords] = useState<GPSPoint[]>([]);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [currentPaceSecKm, setCurrentPaceSecKm] = useState<number>(0);
  const [elevationGainMeters, setElevationGainMeters] = useState<number>(0);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastSpokenKmRef = useRef<number>(0);
  const wakeLockRef = useRef<any>(null);

  // Request Wake Lock so mobile screens don't sleep during a run
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (e) {
      console.warn('Wake Lock request failed:', e);
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  };

  // Voice announcement helper using SpeechSynthesis API
  const speakAnnouncement = (text: string) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('Speech synthesis failed:', e);
    }
  };

  // Timer effect
  useEffect(() => {
    if (status === 'tracking') {
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Handle GPS coordinate updates
  const handlePositionUpdate = useCallback(
    (position: GeolocationPosition) => {
      const { latitude, longitude, altitude, speed, accuracy } = position.coords;
      const timestamp = position.timestamp;

      setGpsAccuracy(accuracy);

      const newPoint: GPSPoint = {
        lat: latitude,
        lng: longitude,
        altitude: altitude || undefined,
        speed: speed || undefined,
        timestamp,
      };

      setCoords((prev) => {
        if (prev.length === 0) {
          return [newPoint];
        }

        const lastPt = prev[prev.length - 1];
        const stepDistKm = computeHaversineDistanceKm(lastPt.lat, lastPt.lng, latitude, longitude);

        // Filter out GPS drift / jump (< 2 meters or > 200 meters jump in 1 second)
        if (stepDistKm < 0.002 || stepDistKm > 0.2) {
          return prev;
        }

        // Calculate elevation gain
        if (altitude && lastPt.altitude && altitude > lastPt.altitude) {
          const elevDelta = altitude - lastPt.altitude;
          if (elevDelta > 0.5 && elevDelta < 20) {
            setElevationGainMeters((elev) => elev + elevDelta);
          }
        }

        // Update cumulative distance
        setDistanceKm((dist) => {
          const newDist = dist + stepDistKm;

          // Check if athlete crossed an integer km split for audio announcement
          const currentKmInt = Math.floor(newDist);
          if (currentKmInt > lastSpokenKmRef.current && currentKmInt >= 1) {
            lastSpokenKmRef.current = currentKmInt;
            const paceMins = Math.floor(currentPaceSecKm / 60);
            const paceSecs = Math.floor(currentPaceSecKm % 60);
            speakAnnouncement(
              `Kilometer ${currentKmInt} complete. Split pace ${paceMins} minutes ${paceSecs} seconds per kilometer. Territory corridor expanding.`
            );
          }

          return newDist;
        });

        // Instant pace calculation from speed (m/s to sec/km)
        if (speed && speed > 0.8) {
          const secPerKm = 1000 / speed;
          setCurrentPaceSecKm(secPerKm);
        } else if (stepDistKm > 0.005) {
          const timeSec = (timestamp - lastPt.timestamp) / 1000;
          if (timeSec > 0) {
            const secPerKm = (timeSec / stepDistKm);
            if (secPerKm > 150 && secPerKm < 1200) {
              setCurrentPaceSecKm(secPerKm);
            }
          }
        }

        return [...prev, newPoint];
      });
    },
    [currentPaceSecKm]
  );

  // Cleanup GPS watcher and wake lock on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      releaseWakeLock();
    };
  }, []);

  const handlePositionError = (err: GeolocationPositionError) => {
    console.error('GPS Geolocation Error:', err);
    const mapped = mapGeolocationError(err);
    setErrorMsg(`${mapped.userMessage} ${mapped.actionableHint}`);
  };

  // Start tracking
  const startRun = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    if (!isSecureContext()) {
      setErrorMsg('GPS tracking requires a secure HTTPS connection.');
      return;
    }

    setErrorMsg(null);
    setStatus('tracking');
    setCoords([]);
    setDistanceKm(0);
    setElapsedSeconds(0);
    setElevationGainMeters(0);
    lastSpokenKmRef.current = 0;

    requestWakeLock();
    speakAnnouncement('Starting run. GPS active. PostGIS territory buffering initialized.');

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 2000,
      }
    );
  }, [handlePositionUpdate]);

  // Pause tracking
  const pauseRun = useCallback(() => {
    setStatus('paused');
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    speakAnnouncement('Run paused.');
  }, []);

  // Resume tracking
  const resumeRun = useCallback(() => {
    setStatus('tracking');
    requestWakeLock();
    speakAnnouncement('Resuming run.');

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [handlePositionUpdate]);

  // Finish tracking
  const finishRun = useCallback(() => {
    setStatus('finished');
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    releaseWakeLock();
    speakAnnouncement(`Run finished. Total distance ${distanceKm.toFixed(2)} kilometers. Calculating territory conquest.`);
  }, [distanceKm]);

  // Reset tracker state
  const resetTracker = useCallback(() => {
    setStatus('idle');
    setCoords([]);
    setDistanceKm(0);
    setElapsedSeconds(0);
    setCurrentPaceSecKm(0);
    setElevationGainMeters(0);
    setErrorMsg(null);
    lastSpokenKmRef.current = 0;
    releaseWakeLock();
  }, []);

  // Compute average pace (sec/km)
  const avgPaceSecKm = distanceKm > 0.05 ? elapsedSeconds / distanceKm : 0;

  // Estimated calories burned
  const caloriesBurned = Math.round(1.036 * athleteWeightKg * distanceKm);

  // Estimated territory conquest area in km² (40m buffer along GPS track = 80m corridor width = 0.08 km² per km)
  const territoryCapturedKm2 = Number((distanceKm * 0.08).toFixed(2));

  return {
    status,
    coords,
    distanceKm,
    elapsedSeconds,
    currentPaceSecKm,
    avgPaceSecKm,
    elevationGainMeters,
    caloriesBurned,
    territoryCapturedKm2,
    gpsAccuracy,
    errorMsg,
    startRun,
    pauseRun,
    resumeRun,
    finishRun,
    resetTracker,
  };
}
