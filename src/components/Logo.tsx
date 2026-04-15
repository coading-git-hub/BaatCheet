import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Microphone Body */}
      <rect x="35" y="15" width="30" height="50" rx="15" stroke="currentColor" strokeWidth="4" />
      
      {/* Faces inside microphone */}
      <path 
        d="M42 25C42 25 38 28 38 35C38 42 42 45 42 45" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
      />
      <path 
        d="M58 25C58 25 62 28 62 35C62 42 58 45 58 45" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
      />
      
      {/* Stand */}
      <path 
        d="M25 45C25 58.8 36.2 70 50 70C63.8 70 75 58.8 75 45" 
        stroke="currentColor" 
        strokeWidth="4" 
        strokeLinecap="round" 
      />
      <path d="M50 70V85" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M35 85H65" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
};
