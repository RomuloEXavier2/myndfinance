import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBase64: string) => Promise<unknown>;
  isProcessing: boolean;
  lastTranscription?: string;
}

export function VoiceRecorder({ onRecordingComplete, isProcessing, lastTranscription }: VoiceRecorderProps) {
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
        
        // Validate audio has content (minimum size check ~1KB for actual audio)
        if (audioBlob.size < 1000) {
          toast.error("Nenhum som detectado. Verifique seu microfone.");
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        
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
      toast.error("Não foi possível acessar o microfone. Verifique as permissões.");
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
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2">
      {/* Debug transcription label */}
      {lastTranscription && (
        <div className="max-w-[200px] rounded-lg bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur-sm border border-border">
          <span className="font-medium text-foreground">IA ouviu:</span>{" "}
          <span className="italic">"{lastTranscription}"</span>
        </div>
      )}
      
      <button
        onClick={handleClick}
        disabled={isProcessing}
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full shadow-2xl transition-all duration-300",
          isRecording
            ? "recording bg-expense animate-pulse"
            : isProcessing
            ? "bg-muted cursor-not-allowed"
            : "mic-pulse bg-primary hover:scale-105 hover:bg-primary/90"
        )}
        aria-label={isRecording ? "Parar gravação" : "Iniciar gravação"}
      >
        {isProcessing ? (
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        ) : isRecording ? (
          <MicOff className="h-7 w-7 text-expense-foreground" />
        ) : (
          <Mic className="h-7 w-7 text-primary-foreground" />
        )}
      </button>
    </div>
  );
}
