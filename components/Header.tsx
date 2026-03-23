import React from 'react';

export default function Header(): React.ReactNode {
  return (
    <header className="bg-white dark:bg-slate-800 shadow-md">
      <div className="container mx-auto px-4 md:px-8 py-4">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
          <span className="text-blue-600 dark:text-blue-400">AI</span> BoQ to Excel Exporter
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Using CESMM4 Standards
        </p>
      </div>
    </header>
  );
}