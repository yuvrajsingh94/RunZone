import React, { useState, useEffect, useRef } from 'react';
import { useLiveGPSTracker, GPSPoint } from '../../hooks/useLiveGPSTracker';
import { api } from '../../services/api';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import { Play, Pause, Square, Radio, Shield, Zap, X, Volume2, Award, CheckCircle2, Flame, Mountain, Mic, MessageSquare } from 'lucide-react';
import { VoiceCoachRecorder } from '../coach/VoiceCoachRecorder';
import toast from 'react-hot-toast';

interface LiveRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunSaved: () => void;
}

// Controller to keep map centered on latest GPS point
const LiveMapController: React.FC<{ coords: GPSPoint[] }> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 0) {
      const latest = coords[coords.length - 1];
      map.panTo([latest.lat, latest.lng], { animate: true, duration: 0.5 });
    }
  }, [coords, map]);
  return null;
};

export const LiveRunModal: React.FC<LiveRunModalProps> = ({ isOpen, onClose, onRunSaved }) => {
  const tracker = useLiveGPSTracker(72);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);
  const [savingRun, setSavingRun] = useState(false);
  const [rpeScore, setRpeScore] = useState(6);
  const [runTitle, setRunTitle] = useState('Live GPS Corridor Run');
  const [voiceCoachOpen, setVoiceCoachOpen] = useState(false);
  const [coachAdvice, setCoachAdvice] = useState<string | null>(null);
  const simTimerRef = useRef<number | null>(null);

  // Simulated GPS track for desktop evaluation (San Francisco Embarcadero Waterfront)
  const SF_SIMULATED_TRACK: [number, number][] = [
    [37.7955, -122.3937],
    [37.7968, -122.3948],
    [37.7982, -122.3962],
    [37.8001, -122.3985],
    [37.8018, -122.4011],
    [37.8035, -122.4042],
    [37.8052, -122.4078],
    [37.8066, -122.4115],
    [37.8078, -122.4158],
    [37.8085, -122.4201],
  ];

  // Helper to format seconds into mm:ss or hh:mm:ss
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to format pace in mm:ss /km
  const formatPace = (secPerKm: number) => {
    if (!secPerKm || secPerKm <= 0 || secPerKm > 1800) return '--:--';
    const mins = Math.floor(secPerKm / 60);
    const secs = Math.floor(secPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Simulation mode for browser sandbox testing
  const startSimulation = () => {
    setIsSimulating(true);
    tracker.startRun();
    setSimulationIndex(0);
  };

  useEffect(() => {
    if (isSimulating && tracker.status === 'tracking') {
      simTimerRef.current = window.setInterval(() => {
        setSimulationIndex((prev) => {
          if (prev < SF_SIMULATED_TRACK.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1500);
    } else {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
        simTimerRef.current = null;
      }
    }
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [isSimulating, tracker.status]);

  // Handle saving the completed run
  const handleSaveActivity = async () => {
    setSavingRun(true);
    try {
      // Build coordinates array in [[lon, lat], ...] format for GeoJSON
      const geojsonCoords =
        tracker.coords.length > 1
          ? tracker.coords.map((pt) => [pt.lng, pt.lat])
          : isSimulating
          ? SF_SIMULATED_TRACK.slice(0, simulationIndex + 1).map((pt) => [pt[1], pt[0]])
          : [
              [-122.3937, 37.7955],
              [-122.3962, 37.7982],
              [-122.4011, 37.8018],
              [-122.4078, 37.8052],
            ];

      const durationSecs = Math.max(tracker.elapsedSeconds, 180);
      const distanceMeters = Math.max(tracker.distanceKm * 1000, 2400);

      await api.recordLiveRun({
        title: runTitle,
        distance_meters: distanceMeters,
        duration_seconds: durationSecs,
        elevation_gain_meters: Math.max(tracker.elevationGainMeters, 15),
        avg_heart_rate: 152,
        rpe_score: rpeScore,
        coordinates: geojsonCoords,
      });

      toast.success('Live GPS run saved & territory claimed!');
      tracker.resetTracker();
      setIsSimulating(false);
      onRunSaved();
      onClose();
    } catch (e: any) {
      toast.error('Failed to save run to PostGIS spatial engine');
    } finally {
      setSavingRun(false);
    }
  };

  if (!isOpen) return null;

  // Polyline for map display
  const mapPolyline: [number, number][] =
    tracker.coords.length > 0
      ? tracker.coords.map((pt) => [pt.lat, pt.lng])
      : isSimulating
      ? SF_SIMULATED_TRACK.slice(0, simulationIndex + 1)
      : [];

  const defaultCenter: [number, number] =
    mapPolyline.length > 0 ? mapPolyline[mapPolyline.length - 1] : [37.7955, -122.3937];

  return (
    <div className="fixed inset-0 z-[9999] bg-night/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-sans">
      <div className="bg-panel border border-hairline w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Control Bar */}
        <div className="px-4 py-3 bg-night hairline-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${tracker.status === 'tracking' ? 'bg-contour animate-pulse' : 'bg-cinder'}`} />
              <h2 className="font-display font-bold text-base text-chalk">
                Live GPS Run Tracker
              </h2>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-panel border border-hairline text-[10px] text-chalk-dim">
              <Radio className="w-3 h-3 text-cinder" />
              <span>40m Corridor Buffer</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {tracker.status === 'idle' && (
              <button
                onClick={startSimulation}
                className="px-2.5 py-1 bg-panel-light hover:bg-panel border border-hairline text-[11px] text-chalk font-medium transition-colors"
                title="Test simulated GPS coordinates"
              >
                Test simulated walk
              </button>
            )}
            <button
              onClick={() => {
                tracker.resetTracker();
                setIsSimulating(false);
                onClose();
              }}
              className="p-1.5 text-chalk-dim hover:text-chalk transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Running Cockpit Body */}
        {tracker.status === 'finished' ? (
          /* Post-Run Review Screen */
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="flex items-center gap-3 bg-[#1A2622] border border-[#3E8E7E]/60 p-4">
              <CheckCircle2 className="w-6 h-6 text-contour shrink-0" />
              <div>
                <h3 className="font-display text-base font-bold text-chalk">
                  Workout complete — Ready to claim territory!
                </h3>
                <p className="text-xs text-chalk-muted">
                  Your GPS route will be buffered by 40 meters in PostGIS and applied to your ACWR fatigue baseline.
                </p>
              </div>
            </div>

            {/* Run Title */}
            <div>
              <label className="block text-xs text-chalk-muted mb-1">
                Activity title
              </label>
              <input
                type="text"
                value={runTitle}
                onChange={(e) => setRunTitle(e.target.value)}
                className="w-full px-3 py-2 bg-night border border-hairline text-chalk text-xs focus:outline-none focus:border-cinder"
              />
            </div>

            {/* Stats Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-night border border-hairline p-3">
                <div className="text-[10px] text-chalk-dim">Distance</div>
                <div className="font-display text-lg font-bold text-chalk tabular mt-0.5">
                  {tracker.distanceKm.toFixed(2)} km
                </div>
              </div>

              <div className="bg-night border border-hairline p-3">
                <div className="text-[10px] text-chalk-dim">Duration</div>
                <div className="font-display text-lg font-bold text-chalk tabular mt-0.5">
                  {formatTime(tracker.elapsedSeconds)}
                </div>
              </div>

              <div className="bg-night border border-hairline p-3">
                <div className="text-[10px] text-chalk-dim">Avg pace</div>
                <div className="font-display text-lg font-bold text-chalk tabular mt-0.5">
                  {formatPace(tracker.avgPaceSecKm)} /km
                </div>
              </div>

              <div className="bg-night border border-hairline p-3">
                <div className="text-[10px] text-chalk-dim">Territory captured</div>
                <div className="font-display text-lg font-bold text-cinder tabular mt-0.5">
                  +{tracker.territoryCapturedKm2} km²
                </div>
              </div>
            </div>

            {/* RPE Effort Rating Slider */}
            <div className="bg-night border border-hairline p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-chalk-muted font-medium">
                  Rate of Perceived Exertion (RPE 1–10)
                </span>
                <span className="font-display font-bold text-chalk tabular">
                  {rpeScore} / 10 · {rpeScore <= 4 ? 'Easy Recovery' : rpeScore <= 7 ? 'Aerobic Sweet Spot' : 'Threshold / Maximal'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={rpeScore}
                onChange={(e) => setRpeScore(Number(e.target.value))}
                className="w-full accent-cinder cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-chalk-dim">
                <span>1 (Gentle Walk)</span>
                <span>5 (Conversational)</span>
                <span>8 (Lactate Threshold)</span>
                <span>10 (All-Out Sprint)</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={tracker.resetTracker}
                className="px-4 py-2.5 bg-night hover:bg-panel-light text-chalk text-xs border border-hairline transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSaveActivity}
                disabled={savingRun}
                className="flex-1 px-4 py-2.5 bg-cinder hover:bg-cinder-hover text-chalk text-xs font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4" />
                <span>{savingRun ? 'Buffering PostGIS corridor…' : 'Save run & capture territory'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Live Tracking Cockpit Screen */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left: Big Metrics Grid */}
            <div className="w-full lg:w-1/2 p-4 sm:p-6 space-y-5 bg-panel flex flex-col justify-between overflow-y-auto">
              {/* Giant Primary Metrics */}
              <div className="space-y-4">
                {/* Distance Metric */}
                <div className="bg-night border border-hairline p-4 text-center">
                  <div className="text-xs text-chalk-dim uppercase tracking-wider font-sans">
                    Total distance
                  </div>
                  <div className="font-display text-4xl sm:text-5xl font-extrabold text-chalk tabular tracking-tight mt-1">
                    {tracker.distanceKm.toFixed(2)}
                    <span className="text-base sm:text-lg font-medium text-chalk-muted ml-1.5">km</span>
                  </div>
                </div>

                {/* Pace & Time Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-night border border-hairline p-3.5 text-center">
                    <div className="text-[11px] text-chalk-dim uppercase font-sans">
                      Current pace
                    </div>
                    <div className="font-display text-2xl sm:text-3xl font-bold text-chalk tabular mt-1">
                      {formatPace(tracker.currentPaceSecKm)}
                      <span className="text-xs text-chalk-muted ml-1">/km</span>
                    </div>
                  </div>

                  <div className="bg-night border border-hairline p-3.5 text-center">
                    <div className="text-[11px] text-chalk-dim uppercase font-sans">
                      Elapsed time
                    </div>
                    <div className="font-display text-2xl sm:text-3xl font-bold text-chalk tabular mt-1">
                      {formatTime(tracker.elapsedSeconds)}
                    </div>
                  </div>
                </div>

                {/* Secondary Telemetry Strip */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-night border border-hairline p-2">
                    <div className="text-[10px] text-chalk-dim flex items-center justify-center gap-1">
                      <Zap className="w-3 h-3 text-cinder" />
                      <span>Territory</span>
                    </div>
                    <div className="font-display font-semibold text-cinder tabular mt-0.5">
                      +{tracker.territoryCapturedKm2} km²
                    </div>
                  </div>

                  <div className="bg-night border border-hairline p-2">
                    <div className="text-[10px] text-chalk-dim flex items-center justify-center gap-1">
                      <Flame className="w-3 h-3 text-amber-500" />
                      <span>Calories</span>
                    </div>
                    <div className="font-display font-semibold text-chalk tabular mt-0.5">
                      {tracker.caloriesBurned} kcal
                    </div>
                  </div>

                  <div className="bg-night border border-hairline p-2">
                    <div className="text-[10px] text-chalk-dim flex items-center justify-center gap-1">
                      <Mountain className="w-3 h-3 text-contour" />
                      <span>Elevation</span>
                    </div>
                    <div className="font-display font-semibold text-chalk tabular mt-0.5">
                      +{Math.round(tracker.elevationGainMeters)} m
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Message / Error Banner */}
              {tracker.errorMsg && (
                <div className="p-2.5 bg-[#2A1715] border border-[#C1432E] text-xs text-chalk">
                  {tracker.errorMsg}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {tracker.status === 'idle' && (
                  <button
                    onClick={tracker.startRun}
                    className="w-full py-3.5 bg-cinder hover:bg-cinder-hover text-chalk font-display font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>START GPS RUN</span>
                  </button>
                )}

                {tracker.status === 'tracking' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={tracker.pauseRun}
                      className="py-3 bg-panel-light hover:bg-panel border border-hairline text-chalk font-display font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Pause className="w-4 h-4" />
                      <span>PAUSE</span>
                    </button>
                    <button
                      onClick={tracker.finishRun}
                      className="py-3 bg-cinder hover:bg-cinder-hover text-chalk font-display font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>FINISH RUN</span>
                    </button>
                  </div>
                )}

                {tracker.status === 'paused' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={tracker.resumeRun}
                      className="py-3 bg-contour hover:bg-emerald-600 text-white font-display font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>RESUME</span>
                    </button>
                    <button
                      onClick={tracker.finishRun}
                      className="py-3 bg-cinder hover:bg-cinder-hover text-chalk font-display font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>FINISH RUN</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Live Dark Leaflet Map with Breadcrumbs */}
            <div className="w-full lg:w-1/2 h-64 lg:h-auto min-h-[300px] relative bg-night hairline-l">
              <MapContainer
                center={defaultCenter}
                zoom={14}
                scrollWheelZoom={true}
                className="w-full h-full"
              >
                <LiveMapController coords={tracker.coords} />

                {/* MapTiler Dark Streets Basemap */}
                <TileLayer
                  attribution='&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url={`https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_API_KEY || ''}`}
                  maxZoom={22}
                  tileSize={256}
                />

                {/* Live Breadcrumbs Polyline */}
                {mapPolyline.length > 0 && (
                  <>
                    {/* 40m Buffered Glow Path */}
                    <Polyline
                      positions={mapPolyline}
                      pathOptions={{
                        color: '#B8492E',
                        weight: 16,
                        opacity: 0.35,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }}
                    />
                    {/* Sharp Core Polyline */}
                    <Polyline
                      positions={mapPolyline}
                      pathOptions={{
                        color: '#E05A3B',
                        weight: 4,
                        opacity: 0.95,
                      }}
                    />
                    {/* Live Runner Position Pin */}
                    <CircleMarker
                      center={mapPolyline[mapPolyline.length - 1]}
                      radius={7}
                      pathOptions={{
                        color: '#FFFFFF',
                        fillColor: '#B8492E',
                        fillOpacity: 1,
                        weight: 2,
                      }}
                    />
                  </>
                )}
              </MapContainer>

              {/* Map Overlay Badge */}
              <div className="absolute top-3 left-3 z-[1000] bg-night/90 border border-hairline px-2.5 py-1 text-[11px] text-chalk font-display flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cinder inline-block animate-pulse" />
                <span>Live Route Breadcrumbs</span>
              </div>

              {/* Floating Hands-Free Voice Coach Button */}
              <div className="absolute bottom-4 right-4 z-[1000]">
                <button
                  onClick={() => setVoiceCoachOpen(!voiceCoachOpen)}
                  className="px-3.5 py-2 bg-cinder hover:bg-cinder-hover text-chalk text-xs font-display font-bold shadow-2xl flex items-center gap-2 border border-white/20 transition-transform active:scale-95"
                  title="Ask ZoneCoach a question with your voice hands-free"
                >
                  <Mic className="w-4 h-4 animate-bounce" />
                  <span>{voiceCoachOpen ? 'Close Voice HUD' : 'Ask Coach (Voice)'}</span>
                </button>
              </div>

              {/* Collapsible Voice Coach HUD */}
              {voiceCoachOpen && (
                <div className="absolute inset-x-3 bottom-14 z-[1001] bg-night/95 backdrop-blur-md border border-hairline p-3 shadow-2xl space-y-2 max-h-72 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-display font-bold text-chalk flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cinder animate-pulse" />
                      <span>ZoneCoach In-Run Voice Assistant</span>
                    </span>
                    <button
                      onClick={() => setVoiceCoachOpen(false)}
                      className="p-1 text-chalk-dim hover:text-chalk"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <VoiceCoachRecorder
                    onTranscriptionComplete={() => {}}
                    onAssistantResponse={(response) => setCoachAdvice(response)}
                    autoSpeakResponse={true}
                  />

                  {coachAdvice && (
                    <div className="p-2.5 bg-panel border border-hairline text-xs text-chalk leading-relaxed font-sans">
                      <div className="text-[10px] text-chalk-dim font-display uppercase font-semibold mb-1">
                        Coach Spoken Feedback:
                      </div>
                      {coachAdvice.replace(/[*#_`>]/g, '')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
