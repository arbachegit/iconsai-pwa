import { useState, useEffect, useCallback, useRef } from "react";

interface UseVoiceRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  confidence: number;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  error: string | null;
  isSupported: boolean;
}

export const useVoiceRecognition = (): UseVoiceRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      const recognition = new SpeechRecognitionAPI();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "pt-BR";
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interim = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            setConfidence(result[0].confidence);
          } else {
            interim += result[0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setError(event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognition.onstart = () => {
        setError(null);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      setError("Speech recognition not supported");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript("");
        setInterimTranscript("");
        setError(null);
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start recognition:", err);
        setError("Failed to start voice recognition");
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setConfidence(0);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    confidence,
    startListening,
    stopListening,
    resetTranscript,
    error,
    isSupported,
  };
};

export default useVoiceRecognition;
