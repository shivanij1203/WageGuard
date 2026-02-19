import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { getDeepgramToken } from "../api";

interface Props {
  onTranscript: (text: string) => void;
}

export default function VoiceButton({ onTranscript }: Props) {
  const [recording, setRecording] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    setConnecting(true);
    try {
      const apiKey = await getDeepgramToken();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const socket = new WebSocket(
        "wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=false",
        ["token", apiKey]
      );
      socketRef.current = socket;

      socket.onopen = () => {
        setConnecting(false);
        setRecording(true);

        const recorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });
        mediaRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(e.data);
          }
        };
        recorder.start(250);
      };

      socket.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        const transcript = data?.channel?.alternatives?.[0]?.transcript;
        if (transcript && data.is_final) {
          onTranscript(transcript);
        }
      };

      socket.onerror = () => {
        setConnecting(false);
        setRecording(false);
      };

      socket.onclose = () => {
        setRecording(false);
      };
    } catch (err) {
      console.error("Voice error:", err);
      setConnecting(false);
    }
  }, [onTranscript]);

  const stop = useCallback(() => {
    mediaRef.current?.stop();
    socketRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
  }, []);

  const isActive = recording || connecting;

  return (
    <button
      onClick={isActive ? stop : start}
      className={`relative p-3 rounded-full transition-all ${
        recording
          ? "bg-red-500 text-white shadow-lg shadow-red-200"
          : connecting
          ? "bg-gray-200 text-gray-500"
          : "bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600"
      }`}
      title={recording ? "Stop recording" : "Start voice input"}
    >
      {recording && (
        <span className="absolute inset-0 rounded-full bg-red-400 voice-pulse" />
      )}
      <span className="relative">
        {connecting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : recording ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </span>
    </button>
  );
}
