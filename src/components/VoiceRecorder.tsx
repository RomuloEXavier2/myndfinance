import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBase64: string) => Promise<void>;
  isProcessing: boolean;
}

export function VoiceRecorder({ onRecordingComplete, isProcessing }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64 = (reader.result as string).split(",")[1];
            await onRecordingComplete(base64);
          } catch (error) {
            // Avoid unhandled promise rejection (the hook already shows a toast)
            console.error("Error processing recorded audio:", error);
          }
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleClick = () => {
    if (isProcessing) return;
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isProcessing}
      className={cn(
        "fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full shadow-2xl transition-all duration-300",
        isRecording
          ? "recording bg-expense"
          : isProcessing
          ? "bg-muted cursor-not-allowed"
          : "mic-pulse bg-primary hover:scale-105 hover:bg-primary/90"
      )}
      aria-label={isRecording ? "Stop recording" : "Start recording"}
    >
      {isProcessing ? (
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      ) : isRecording ? (
        <MicOff className="h-7 w-7 text-expense-foreground" />
      ) : (
        <Mic className="h-7 w-7 text-primary-foreground" />
      )}
    </button>
  );
}
