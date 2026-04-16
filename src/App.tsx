import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Languages, 
  ArrowLeftRight, 
  Settings2, 
  History as HistoryIcon, 
  Volume2, 
  Copy, 
  Check,
  AlertCircle,
  Moon,
  Sun,
  X,
  Share2,
  ExternalLink,
  Mic
} from 'lucide-react';
import { LanguageSelector } from './components/LanguageSelector';
import { MicButton } from './components/MicButton';
import { TranslationHistory } from './components/TranslationHistory';
import { Logo } from './components/Logo';
import { LANGUAGES } from './constants';
import { Language, TranslationRecord, AppSettings } from './types';
import { translateText } from './services/geminiService';
import { cn } from './lib/utils';

// Web Speech API Types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  // State
  const [sourceLang, setSourceLang] = useState<Language>(LANGUAGES[0]); // English
  const [targetLang, setTargetLang] = useState<Language>(LANGUAGES[1]); // Hindi
  const [isListening, setIsListening] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [history, setHistory] = useState<TranslationRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [settings, setSettings] = useState<AppSettings>({
    voiceSpeed: 1,
    voicePitch: 1,
    theme: 'light'
  });

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const transcriptRef = useRef("");
  const unsupportedVoiceLanguages = ['ar', 'ur', 'pa', 'bn', 'mr', 'te', 'ta', 'gu', 'kn', 'ml'];

  // Initialize Speech Services
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current!.continuous = false;
      recognitionRef.current!.interimResults = true;
    } else {
      setError("Speech recognition is not supported in this browser.");
    }

    synthesisRef.current = window.speechSynthesis;
    
    // Some browsers need this to load voices
    const loadVoices = () => {
      if (synthesisRef.current) {
        synthesisRef.current.getVoices();
      }
    };
    loadVoices();
    if (synthesisRef.current) {
      synthesisRef.current.onvoiceschanged = loadVoices;
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load history from localStorage
    const savedHistory = localStorage.getItem('baatcheet_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    // Load settings
    const savedSettings = localStorage.getItem('baatcheet_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-translate typed text with debounce
  useEffect(() => {
    if (isListening || !originalText.trim() || isTranslating) return;

    const timer = setTimeout(() => {
      // Only auto-translate if the text hasn't changed and it's different from what's already translated
      if (originalText.trim().length > 2) {
        handleTranslate(originalText);
      }
    }, 1500); // 1.5 second delay after typing stops

    return () => clearTimeout(timer);
  }, [originalText, isListening]);

  // Trigger translation when languages change
  useEffect(() => {
    if (originalText.trim() && !isListening) {
      handleTranslate(originalText);
    }
  }, [targetLang, sourceLang]);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('baatcheet_history', JSON.stringify(history));
  }, [history]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('baatcheet_settings', JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // Handle Speech Synthesis
  const speak = useCallback((text: string, langCode: string) => {
    if (!synthesisRef.current) return;
    
    // Cancel any ongoing speech and reset
    synthesisRef.current.cancel();

    // Small delay to ensure previous speech is fully cancelled
    setTimeout(() => {
      if (!synthesisRef.current) return;

      const utterance = new SpeechSynthesisUtterance(text);
      setVoiceNotice(null);

      // Try to find the best matching voice
      let voices = synthesisRef.current.getVoices();
      if (voices.length === 0 && synthesisRef.current.onvoiceschanged) {
        voices = synthesisRef.current.getVoices();
      }

      if (voices.length === 0) {
        console.warn("No speech synthesis voices are loaded yet. Speech may still work with the browser default voice.");
      }

      // Priority matching: 1. Exact lang match, 2. Starts with lang code, 3. Includes lang code
      const voice = voices.find(v => v.lang === langCode) ||
                    voices.find(v => v.lang.startsWith(langCode)) ||
                    voices.find(v => v.lang.includes(langCode));

      if (voice) {
        utterance.voice = voice;
      } else {
        const fallbackVoice = voices.find(v => v.default) || voices[0];
        if (fallbackVoice) {
          utterance.voice = fallbackVoice;
        }

        console.warn(`No specific voice found for ${langCode}. Using system/default voice.`);
        if (unsupportedVoiceLanguages.includes(langCode)) {
          setVoiceNotice(`Note: ${targetLang.name} voice may not be available in this browser. Translation will still work, but voice output may vary.`);
        }
      }

      utterance.lang = langCode;
      utterance.rate = settings.voiceSpeed;
      utterance.pitch = settings.voicePitch;
      utterance.volume = 1; // Ensure volume is up
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (event) => {
        console.error("SpeechSynthesisUtterance error", event);
        setIsSpeaking(false);
        
        // Fallback: If it failed, try once more without a specific voice
        if (event.error === 'interrupted') return;
        console.log("Retrying speech without specific voice...");
        const fallbackUtterance = new SpeechSynthesisUtterance(text);
        fallbackUtterance.lang = langCode;
        synthesisRef.current?.speak(fallbackUtterance);
      };

      synthesisRef.current.speak(utterance);
      
      // Chrome bug fix: sometimes speech gets stuck, calling resume helps
      if (synthesisRef.current.paused) {
        synthesisRef.current.resume();
      }
    }, 150);
  }, [settings, targetLang.name]);

  // Handle Translation
  const lastTranslatedText = useRef("");
  const handleTranslate = async (text: string) => {
    const textToTranslate = text || originalText;
    if (!textToTranslate.trim() || textToTranslate === lastTranslatedText.current) return;
    
    lastTranslatedText.current = textToTranslate;
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await translateText(textToTranslate, sourceLang.name, targetLang.name);
      
      if (result.startsWith("Error: ")) {
        setError(result.replace("Error: ", ""));
        setTranslatedText("");
      } else {
        setTranslatedText(result);
        // Speak the result only if not listening
        if (!isListening) {
          speak(result, targetLang.code);
        }

        // Add to history
        const newRecord: TranslationRecord = {
          id: Date.now().toString(),
          originalText: textToTranslate,
          translatedText: result,
          sourceLang,
          targetLang,
          timestamp: Date.now()
        };
        
        setHistory(prev => [newRecord, ...prev].slice(0, 20));
      }
    } catch (err) {
      setError("Translation failed. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle Mic Start/Stop
  const startListening = async () => {
    if (!recognitionRef.current) return;
    
    setError(null);
    if (!isOnline) {
      setError("Network error: Speech recognition requires an active internet connection. Please check your connection and try again.");
      return;
    }
    setOriginalText("");
    setTranslatedText("");
    transcriptRef.current = "";

    // Explicitly request microphone permission first
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Your browser does not support microphone access or you are in an insecure context. Please try a modern browser like Chrome or Edge.");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("Microphone permission error:", err);
      const errorMessage = err instanceof Error ? err.name : String(err);
      
      if (errorMessage === 'NotAllowedError' || errorMessage === 'PermissionDeniedError' || String(err).includes('denied')) {
        setError("Microphone access is restricted in this preview. Please open the app in a new tab to use voice features.");
      } else if (errorMessage === 'NotFoundError' || errorMessage === 'DevicesNotFoundError') {
        setError("No microphone found. Please connect a microphone and try again.");
      } else {
        setError(`Microphone error: ${errorMessage}. Please try opening in a new tab.`);
      }
      return;
    }
    
    recognitionRef.current.lang = sourceLang.code;
    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join("");
      setOriginalText(transcript);
      transcriptRef.current = transcript;
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === 'not-allowed') {
        setError("Microphone access is restricted in this preview. Please open the app in a new tab to use voice features.");
      } else if (event.error === 'network') {
        setError("Network error: Speech recognition requires an active internet connection. Please check your connection and try again.");
      } else if (event.error === 'no-speech') {
        // Silent error, just stop listening
        setIsListening(false);
      } else {
        setError(`Speech recognition failed: ${event.error}. Please try opening in a new tab.`);
      }
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error("Failed to start recognition", err);
      // If already started, just ignore
      if (err instanceof Error && err.message.includes('already started')) {
        setIsListening(true);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      
      // Trigger translation after a short delay to ensure we have the final transcript
      setTimeout(() => {
        if (transcriptRef.current) {
          handleTranslate(transcriptRef.current);
        }
      }, 500);
    }
  };

  // UI Helpers
  const swapLanguages = () => {
    lastTranslatedText.current = ""; // Reset to allow re-translation
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setOriginalText(translatedText);
    setTranslatedText(originalText);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300 bg-bg text-text-primary font-sans",
    )}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border px-10 py-6 flex items-center justify-between">
        <div className="brand flex items-center gap-3">
          <div className="logo-circle w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center text-bg shadow-lg shadow-accent-teal/20 p-1.5">
            <Logo className="w-full h-full" />
          </div>
          <div className="brand-text">
            <h1 className="text-2xl font-bold tracking-tight leading-none">BaatCheet</h1>
            <p className="text-[10px] uppercase tracking-[2px] font-bold text-text-secondary mt-1">Real-Time Voice System</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.open(window.location.href, '_blank')}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-teal/10 text-accent-teal text-xs font-bold hover:bg-accent-teal/20 transition-all border border-accent-teal/20"
          >
            <ExternalLink size={14} />
            Open in New Tab
          </button>
          <div className="hidden md:block px-3 py-1 rounded bg-border text-[9px] font-bold text-accent-teal uppercase tracking-wider">
            Web v1.0.4
          </div>
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full border border-border",
            isOnline ? "bg-green-500/5" : "bg-red-500/5"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isOnline ? "bg-green-500" : "bg-red-500 animate-pulse"
            )} />
            <span className="text-[8px] font-bold uppercase tracking-tighter text-text-secondary">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            error ? "bg-red-500" : "bg-accent-teal"
          )} title={error ? "Microphone Error" : "Microphone Ready"} />
          <button 
            onClick={() => setSettings(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' }))}
            className="p-2.5 rounded-xl border border-border hover:bg-surface transition-colors text-text-secondary"
          >
            {settings.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-10 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-8 h-full items-start">
          
          {/* Left Panel: Settings */}
          <aside className="space-y-6 order-2 lg:order-1">
            <div className="geometric-card">
              <div className="card-title text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-6 flex justify-between">
                Voice Settings
              </div>
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Pitch</label>
                    <span className="text-[10px] font-mono text-accent-teal">{settings.voicePitch}x</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="2" step="0.1" value={settings.voicePitch}
                    onChange={(e) => setSettings(s => ({ ...s, voicePitch: parseFloat(e.target.value) }))}
                    className="w-full accent-accent-teal bg-border rounded-full h-1 appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Speed</label>
                    <span className="text-[10px] font-mono text-accent-teal">{settings.voiceSpeed}x</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="2" step="0.1" value={settings.voiceSpeed}
                    onChange={(e) => setSettings(s => ({ ...s, voiceSpeed: parseFloat(e.target.value) }))}
                    className="w-full accent-accent-teal bg-border rounded-full h-1 appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="geometric-card">
              <div className="card-title text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-4">
                System Info
              </div>
              <div className="space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Engine:</span>
                  <span className="text-accent-teal">Gemini 3.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Latency:</span>
                  <span className="text-accent-teal">~240ms</span>
                </div>
                <div className="pt-4 mt-4 border-t border-border/50 space-y-4">
                  <p className="text-[9px] text-text-secondary leading-relaxed">
                    <span className="text-accent-teal font-bold">MIC TIP:</span> If the microphone doesn't work, click "Open in New Tab".
                  </p>
                  <p className="text-[9px] text-text-secondary leading-relaxed">
                    <span className="text-accent-teal font-bold">VOICE TIP:</span> If you can't hear the translation, ensure your device is not on silent and click the speaker icon manually.
                  </p>
                  <p className="text-[9px] text-text-secondary leading-relaxed">
                    <span className="text-accent-teal font-bold">NET TIP:</span> Speech recognition needs internet. If you see a "network" error, check your Wi-Fi or data connection.
                  </p>
                  <button 
                    onClick={startListening}
                    className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-bold uppercase tracking-widest text-text-secondary hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Mic size={10} />
                    Test Microphone
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Center Panel: Translator */}
          <section className="space-y-6 order-1 lg:order-2">
            <div className="bg-white/5 border border-border rounded-[24px] p-4 flex items-center gap-4">
              <LanguageSelector label="Source" selected={sourceLang} onSelect={setSourceLang} />
              <button 
                onClick={swapLanguages}
                className="mt-5 w-10 h-10 flex items-center justify-center rounded-full bg-surface border border-border hover:border-accent-teal transition-all text-text-secondary hover:text-accent-teal"
              >
                <ArrowLeftRight size={16} />
              </button>
              <LanguageSelector label="Target" selected={targetLang} onSelect={setTargetLang} />
            </div>

            <div className="min-h-[300px] flex flex-col gap-4">
              <div className="space-y-4">
                <div className="geometric-bubble-source">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Input</span>
                    <div className="flex items-center gap-2">
                      {isListening && <span className="text-[9px] font-bold text-accent-teal animate-pulse">LISTENING...</span>}
                      {!isListening && originalText && !isTranslating && (
                        <span className="text-[8px] font-bold text-text-secondary uppercase tracking-tighter opacity-40">Auto-translate active</span>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={originalText}
                    onChange={(e) => {
                      setOriginalText(e.target.value);
                      transcriptRef.current = e.target.value;
                    }}
                    dir={['ar', 'ur'].includes(sourceLang.code) ? 'rtl' : 'ltr'}
                    placeholder={isListening ? "Listening..." : "Type here or use the microphone..."}
                    className="w-full bg-transparent border-none focus:ring-0 text-lg leading-relaxed resize-none h-24 custom-scrollbar"
                    disabled={isListening}
                  />
                  {!isListening && originalText && (
                    <div className="flex justify-end mt-2">
                      <button 
                        onClick={() => handleTranslate(originalText)}
                        disabled={isTranslating}
                        className="px-3 py-1 bg-white/5 border border-white/10 text-text-secondary text-[9px] font-bold rounded-lg hover:bg-white/10 transition-all uppercase tracking-widest disabled:opacity-50"
                      >
                        {isTranslating ? "Translating..." : "Translate Now"}
                      </button>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {translatedText && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="geometric-bubble-target"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Translation</span>
                        <div className="flex items-center gap-2">
                          {isSpeaking && (
                            <motion.div 
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 1 }}
                              className="w-1.5 h-1.5 bg-accent-teal rounded-full"
                            />
                          )}
                          <button 
                            onClick={() => speak(translatedText, targetLang.code)}
                            title="Listen to translation"
                            className={cn(
                              "p-2 rounded-full transition-all",
                              isSpeaking 
                                ? "bg-accent-teal/20 text-accent-teal scale-110" 
                                : "bg-white/5 text-text-secondary hover:bg-white/10 hover:text-accent-teal"
                            )}
                          >
                            <Volume2 size={18} />
                          </button>
                        </div>
                      </div>
                      <p 
                        className="text-xl font-bold"
                        dir={['ar', 'ur'].includes(targetLang.code) ? 'rtl' : 'ltr'}
                      >
                        {translatedText}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {voiceNotice && (
                  <div className="rounded-3xl border border-accent-teal/20 bg-accent-teal/5 p-4 text-sm text-text-secondary">
                    {voiceNotice}
                  </div>
                )}
              </div>

              {isTranslating && (
                <div className="flex justify-center py-4">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                        className="w-1.5 h-1.5 bg-accent-teal rounded-full"
                      />
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-8 bg-red-500/10 border-2 border-red-500/30 rounded-[40px] text-red-400 flex flex-col items-center text-center gap-8 backdrop-blur-md shadow-2xl shadow-red-500/10">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center"
                  >
                    <AlertCircle size={40} />
                  </motion.div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-white">Microphone Access Denied</h3>
                    <p className="text-sm opacity-80 max-w-[280px] mx-auto leading-relaxed">
                      {error}
                    </p>
                  </div>
                  
                  <div className="w-full space-y-4">
                    <div className="bg-white/5 rounded-2xl p-4 text-left space-y-3 border border-white/5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">How to fix:</p>
                      <ul className="text-[11px] space-y-2 text-text-secondary">
                        <li className="flex gap-2">
                          <span className="text-accent-teal font-bold">1.</span>
                          <span>Click the <span className="text-white font-bold">"Open in New Tab"</span> button below.</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-accent-teal font-bold">2.</span>
                          <span>In the new tab, click <span className="text-white font-bold">"Allow"</span> when the browser asks for microphone access.</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-accent-teal font-bold">3.</span>
                          <span>If you already blocked it, click the <span className="text-white font-bold">Lock icon</span> (🔒) in the address bar and reset permissions.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex flex-col w-full gap-3">
                      {error.includes("new tab") && (
                        <motion.button 
                          animate={{ boxShadow: ["0 0 0 0px rgba(45, 212, 191, 0)", "0 0 0 15px rgba(45, 212, 191, 0.2)", "0 0 0 0px rgba(45, 212, 191, 0)"] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          onClick={() => window.open(window.location.href, '_blank')}
                          className="w-full py-5 bg-accent-teal text-bg rounded-2xl font-black uppercase tracking-[2px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-accent-teal/30"
                        >
                          Open in New Tab
                        </motion.button>
                      )}
                      <button 
                        onClick={() => setError(null)}
                        className="w-full py-3 border border-white/10 text-text-secondary rounded-2xl text-[10px] font-bold hover:bg-white/5 transition-all uppercase tracking-widest"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-4 pt-10">
              <MicButton 
                isListening={isListening} 
                onStart={startListening} 
                onEnd={stopListening}
                disabled={isTranslating}
              />
              <p className="text-[10px] font-bold uppercase tracking-[3px] text-text-secondary">
                {isListening ? "Release to Translate" : "Hold to Speak"}
              </p>
            </div>
          </section>

          {/* Right Panel: History */}
          <aside className="order-3">
            <div className="geometric-card h-full max-h-[600px] overflow-y-auto custom-scrollbar">
              <TranslationHistory 
                history={history} 
                onDelete={(id) => setHistory(h => h.filter(r => r.id !== id))}
                onSpeak={speak}
                onClear={() => setHistory([])}
              />
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
}
