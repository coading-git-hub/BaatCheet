import React from 'react';
import { TranslationRecord } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Share2, Volume2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TranslationHistoryProps {
  history: TranslationRecord[];
  onDelete: (id: string) => void;
  onSpeak: (text: string, langCode: string) => void;
  onClear: () => void;
}

export const TranslationHistory: React.FC<TranslationHistoryProps> = ({ 
  history, 
  onDelete, 
  onSpeak,
  onClear 
}) => {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <Clock size={48} className="mb-4 opacity-20" />
        <p className="text-sm font-medium">No translation history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[11px] font-bold uppercase tracking-[2px] text-text-secondary">Recent History</h3>
        <button 
          onClick={onClear}
          className="text-xs font-bold text-red-400 hover:text-red-500 transition-colors uppercase tracking-wider"
        >
          Clear
        </button>
      </div>
      
      <AnimatePresence initial={false}>
        {history.map((record) => (
          <motion.div
            key={record.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="py-5 border-b border-border last:border-0 group"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-border">
                  <img 
                    src={`https://flagcdn.com/w20/${record.sourceLang.flag}.png`} 
                    alt={record.sourceLang.name}
                    className="w-3 h-2 object-cover rounded-[1px]"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[9px] font-bold text-text-secondary uppercase">
                    {record.sourceLang.code}
                  </span>
                  <span className="text-text-secondary opacity-30 mx-0.5">→</span>
                  <img 
                    src={`https://flagcdn.com/w20/${record.targetLang.flag}.png`} 
                    alt={record.targetLang.name}
                    className="w-3 h-2 object-cover rounded-[1px]"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[9px] font-bold text-accent-teal uppercase">
                    {record.targetLang.code}
                  </span>
                </div>
                <span className="text-[9px] text-text-secondary uppercase tracking-wider opacity-50">
                  {formatDistanceToNow(record.timestamp, { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onSpeak(record.translatedText, record.targetLang.code)}
                  className="text-accent-teal hover:text-accent-indigo transition-colors"
                >
                  <Volume2 size={14} />
                </button>
                <button 
                  onClick={() => onDelete(record.id)}
                  className="text-red-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-text-secondary line-clamp-1">"{record.originalText}"</p>
              <p className="text-sm font-medium text-text-primary">{record.translatedText}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
