import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import { Mic, Square, Volume2, VolumeX, Loader2, Sparkles, Radio } from 'lucide-react';
import toast from 'react-hot-toast';

interface VoiceCoachRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onAssistantResponse?: (response: string, modelUsed: string) => void;
  autoSpeakResponse?: boolean;
}

export const VoiceCoachRecorder: React.FC<VoiceCoachRecorderProps> = ({
  onTranscriptionComplete,
  onAssistantResponse,
  autoSpeakResponse = true,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voiceMuted, setVoiceMuted] = useState<boolean>(!autoSpeakResponse);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Tap mic to speak with ZoneCoach');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  // Voice synthesis helper
  const speakText = (text: string) => {
    if (voiceMuted || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    // Clean markdown asterisks/headers for clean voice narration
    const cleanText = text
      .replace(/[*#_`>]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.02;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatusText('ZoneCoach is speaking…');
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setStatusText('Tap mic to speak with ZoneCoach');
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setStatusText('Tap mic to speak with ZoneCoach');
    };

    window.speechSynthesis.speak(utterance);
  };

  // Start audio recording and visualizer
  const startRecording = async () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Setup Web Audio Analyser for live visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVisualizer = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
        setAudioLevel(0);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setStatusText('Listening… speak naturally about your training');
    } catch (err: any) {
      console.error('Microphone access error:', err);
      toast.error('Microphone permission required for voice coach.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      setStatusText('Transcribing with Groq Whisper Large V3 Turbo…');
    }
  };

  // Process and transcribe audio, then query coach
  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const audioFile = new File([blob], 'coach_query.webm', { type: 'audio/webm' });
      
      // Transcribe via Whisper
      const transRes = await api.transcribeAudio(audioFile);
      const userPrompt = transRes.text.trim();

      if (!userPrompt) {
        toast.error('Could not detect speech. Please try again.');
        setIsProcessing(false);
        setStatusText('Tap mic to speak with ZoneCoach');
        return;
      }

      onTranscriptionComplete(userPrompt);
      setStatusText('ZoneCoach Llama 3.3 70B is thinking…');

      // Call coach chat completion
      const coachRes: any = await api.chatWithCoach(userPrompt);
      
      if (onAssistantResponse) {
        onAssistantResponse(coachRes.response, coachRes.model_used || 'llama-3.3-70b-versatile');
      }

      // Speak answer out loud
      if (!voiceMuted) {
        speakText(coachRes.response);
      } else {
        setStatusText('Tap mic to speak with ZoneCoach');
      }
    } catch (e: any) {
      console.error('Voice coach error:', e);
      toast.error('Voice processing failed.');
      setStatusText('Tap mic to speak with ZoneCoach');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-night border border-hairline p-4 space-y-3 font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-cinder animate-pulse" />
          <span className="font-display font-bold text-xs text-chalk">
            Hands-Free Voice AI Coach
          </span>
          <span className="text-[10px] px-1.5 py-0.2 bg-panel border border-hairline text-chalk-dim font-display">
            Whisper Large V3 Turbo
          </span>
        </div>

        {/* Audio Mute Toggle */}
        <button
          onClick={() => {
            const next = !voiceMuted;
            setVoiceMuted(next);
            if (next && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              setIsSpeaking(false);
            }
          }}
          className="p-1 text-chalk-dim hover:text-chalk transition-colors"
          title={voiceMuted ? 'Unmute voice audio' : 'Mute voice audio'}
        >
          {voiceMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-contour" />}
        </button>
      </div>

      {/* Center Voice Controls & Visualizer */}
      <div className="flex flex-col items-center justify-center py-3 space-y-3">
        {/* Animated Soundwave Visualizer Bars */}
        <div className="flex items-center gap-1 h-8">
          {[0.6, 0.9, 1.3, 1.8, 1.4, 0.8, 1.1, 1.7, 1.2, 0.7].map((factor, i) => {
            const heightPx = isRecording
              ? Math.max(4, Math.min(32, Math.round(audioLevel * factor * 0.35)))
              : isSpeaking
              ? Math.max(6, Math.round(16 + Math.sin(Date.now() * 0.01 + i) * 10))
              : 4;

            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-75 ${
                  isRecording
                    ? 'bg-cinder'
                    : isSpeaking
                    ? 'bg-contour'
                    : 'bg-panel-light'
                }`}
                style={{ height: `${heightPx}px` }}
              />
            );
          })}
        </div>

        {/* Big Tactile Mic Button */}
        <div>
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="w-14 h-14 rounded-full bg-[#C1432E] hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-900/40 animate-pulse transition-transform active:scale-95"
              title="Stop listening"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          ) : isProcessing ? (
            <div className="w-14 h-14 rounded-full bg-panel border border-hairline text-cinder flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <button
              onClick={startRecording}
              className="w-14 h-14 rounded-full bg-cinder hover:bg-cinder-hover text-chalk flex items-center justify-center shadow-lg shadow-cinder/30 transition-transform active:scale-95 group"
              title="Start speaking"
            >
              <Mic className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>

        {/* Live Status Readout */}
        <div className="text-center">
          <p className="text-xs font-display font-medium text-chalk">
            {statusText}
          </p>
          <p className="text-[10px] text-chalk-dim mt-0.5 font-sans">
            Hands-free voice recognition powered by Groq high-speed inference
          </p>
        </div>
      </div>

      {/* Suggested Quick Voice Prompts */}
      <div className="pt-2 hairline-t">
        <div className="text-[10px] text-chalk-dim mb-1.5 uppercase font-display font-semibold">
          Try saying:
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {[
            'What is my ACWR injury risk?',
            'Should I do a Zone 2 run today?',
            'What should I eat before a 10K?',
          ].map((prompt, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-panel border border-hairline text-chalk-muted font-sans"
            >
              "{prompt}"
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
