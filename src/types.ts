export interface Language {
  code: string;
  name: string;
  flag: string;
}

export interface TranslationRecord {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLang: Language;
  targetLang: Language;
  timestamp: number;
}

export interface AppSettings {
  voiceSpeed: number;
  voicePitch: number;
  theme: 'light' | 'dark';
}
