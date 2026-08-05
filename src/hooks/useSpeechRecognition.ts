import { useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void;
  start: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function useSpeechRecognition(language: string) {
  const [error, setError] = useState<string | null>(null);

  function listen(target: "start" | "destination", onResult: (transcript: string) => void) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice search is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) onResult(transcript);
    };
    try {
      recognition.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice recognition failed.");
    }
  }

  return { listen, error, clearError: () => setError(null) };
}
