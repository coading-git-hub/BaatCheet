import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '../lib/utils';

interface MicButtonProps {
  isListening: boolean;
  onStart: () => void;
  onEnd: () => void;
  disabled?: boolean;
}

export const MicButton: React.FC<MicButtonProps> = ({ isListening, onStart, onEnd, disabled }) => {
  return (
    <div className="relative flex items-center justify-center">
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.4, opacity: 0.3 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
            className="absolute w-24 h-24 bg-accent-teal rounded-full"
          />
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onMouseDown={onStart}
        onMouseUp={onEnd}
        onTouchStart={onStart}
        onTouchEnd={onEnd}
        disabled={disabled}
        className={cn(
          "relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
          "border-2",
          isListening ? "border-red-500" : "border-accent-teal",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center shadow-lg",
          isListening 
            ? "bg-red-500 text-white" 
            : "bg-gradient-primary text-bg"
        )}>
          {isListening ? <MicOff size={28} /> : <Mic size={28} />}
        </div>
      </motion.button>
    </div>
  );
};
