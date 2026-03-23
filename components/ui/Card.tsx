
import React from 'react';

interface CardProps {
  children?: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps): React.ReactNode {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 ${className}`}>
      {children}
    </div>
  );
}