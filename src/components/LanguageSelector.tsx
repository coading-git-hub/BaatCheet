import React from 'react';
import { Language } from '../types';
import { LANGUAGES } from '../constants';
import { ChevronDown } from 'lucide-react';

interface LanguageSelectorProps {
  selected: Language;
  onSelect: (lang: Language) => void;
  label: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selected, onSelect, label }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <span className="text-[10px] uppercase tracking-wider font-bold text-text-secondary ml-1">
        {label}
      </span>
      <div className="relative group flex items-center">
        <div className="absolute left-3 z-10 w-6 h-4 overflow-hidden rounded-sm pointer-events-none flex items-center justify-center">
          <img 
            src={`https://flagcdn.com/w40/${selected.flag}.png`} 
            alt={selected.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <select
          value={selected.code}
          onChange={(e) => {
            const lang = LANGUAGES.find(l => l.code === e.target.value);
            if (lang) onSelect(lang);
          }}
          className="w-full appearance-none bg-white/5 dark:bg-white/5 border border-border rounded-2xl pl-11 pr-10 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-teal transition-all cursor-pointer text-text-primary"
        >
          {LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code} className="bg-surface text-text-primary">
              {lang.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none group-hover:text-accent-teal transition-colors" />
      </div>
    </div>
  );
};
