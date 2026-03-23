
import React, { useState, useCallback } from 'react';
import { generateBoq } from './services/geminiService';
import { getConversionRate } from './services/forexService';
import Header from './components/Header';
import InputForm from './components/InputForm';
import BoQDisplay from './components/BoQDisplay';
import { BoQItem, UploadedFile } from './types';

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';

export default function App(): React.ReactNode {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [boqItems, setBoqItems] = useState<BoQItem[]>([]);
  const [currency, setCurrency] = useState<string>('KES');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ KES: 1 });
  const [isCurrencyLoading, setCurrencyLoading] = useState<boolean>(false);

  const handleGenerateBoq = useCallback(async (projectDescription: string, files: UploadedFile[]) => {
    if (!projectDescription.trim() && files.length === 0) {
      setError("Please provide a project description or attach files.");
      setStatus('error');
      return;
    }
    
    setStatus('loading');
    setError(null);
    setBoqItems([]); // Clear previous results

    try {
      const result = await generateBoq(projectDescription, files);
      if (result && result.length > 0) {
        // All monetary values from Gemini are in KES (our base currency)
        const itemsWithPrices: BoQItem[] = result.map(item => {
            const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : Number(item.quantity) || 0;
            const rate = typeof item.rate === 'string' ? parseFloat(item.rate) || 0 : Number(item.rate) || 0;
            const originalPrice = quantity * rate;
            return {
                ...item,
                quantity,
                rate,
                originalPrice,
                revisedQuantity: '',
                revisedPrice: 0,
                savings: originalPrice, // Initially, savings equal the original price
                comments: '',
            };
        });
        setBoqItems(itemsWithPrices);
        setStatus('success');
      } else {
        setError("The model returned an empty or invalid Bill of Quantities. Please try refining your project description or checking your attachments.");
        setStatus('error');
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "An unknown error occurred. Please check the console.");
      setStatus('error');
    }
  }, []);

  const handleRateChange = useCallback((index: number, newRateInSelectedCurrency: number) => {
    setBoqItems(prevItems => {
      const newItems = [...prevItems];
      const item = { ...newItems[index] }; // Create a shallow copy to avoid direct mutation
      if (item) {
        const conversionRate = exchangeRates[currency] || 1;
        const newRateInBase = isNaN(newRateInSelectedCurrency) || conversionRate === 0 
            ? 0 
            : newRateInSelectedCurrency / conversionRate;
        
        item.rate = newRateInBase;
        item.originalPrice = item.quantity * newRateInBase;
        
        const revQty = parseFloat(item.revisedQuantity as string);
        if (!isNaN(revQty)) {
            item.revisedPrice = revQty * newRateInBase;
            item.savings = item.originalPrice - item.revisedPrice;
        } else {
            item.revisedPrice = 0;
            item.savings = item.originalPrice;
        }
        newItems[index] = item;
      }
      return newItems;
    });
  }, [currency, exchangeRates]);
  
  const handleRevisedQuantityChange = useCallback((index: number, newRevisedQtyStr: string) => {
    setBoqItems(prevItems => {
        const newItems = [...prevItems];
        const item = { ...newItems[index] }; // Create a shallow copy
        if (item) {
            item.revisedQuantity = newRevisedQtyStr;
            const newRevisedQty = parseFloat(newRevisedQtyStr);
            if (!isNaN(newRevisedQty)) {
                item.revisedPrice = newRevisedQty * item.rate;
                item.savings = item.originalPrice - item.revisedPrice;
            } else {
                item.revisedPrice = 0;
                item.savings = item.originalPrice; // Corrected: savings is original price if nothing is revised
            }
            newItems[index] = item;
        }
        return newItems;
    });
  }, []);
  
  const handleCommentsChange = useCallback((index: number, newComments: string) => {
    setBoqItems(prevItems => {
        const newItems = [...prevItems];
        const item = { ...newItems[index] }; // Create a shallow copy
        if (item) {
            item.comments = newComments;
            newItems[index] = item;
        }
        return newItems;
    });
  }, []);

  const handleCurrencyChange = async (newCurrency: string) => {
    if (currency === newCurrency || isCurrencyLoading) return;

    setCurrencyLoading(true);
    setError(null);
    try {
        if (!exchangeRates[newCurrency]) {
            const rate = await getConversionRate('KES', newCurrency);
            setExchangeRates(prev => ({ ...prev, [newCurrency]: rate }));
        }
        setCurrency(newCurrency);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update currency. Please try again.');
        // Don't change currency if fetch fails, so user isn't stuck.
    } finally {
        setCurrencyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
          <div className="mb-8 lg:mb-0">
            <InputForm onGenerate={handleGenerateBoq} isLoading={status === 'loading'} />
          </div>
          <div>
            <BoQDisplay
              status={status}
              error={error}
              items={boqItems}
              onRateChange={handleRateChange}
              onRevisedQuantityChange={handleRevisedQuantityChange}
              onCommentsChange={handleCommentsChange}
              currency={currency}
              onCurrencyChange={handleCurrencyChange}
              conversionRate={exchangeRates[currency] || 1}
              isCurrencyLoading={isCurrencyLoading}
            />
          </div>
        </div>
        <footer className="text-center mt-12 text-sm text-slate-500 dark:text-slate-400">
          <p>Powered by Google Gemini. Generated content may require verification.</p>
          <p>Exchange rates provided by Frankfurter.app and may not be real-time.</p>
          <p>CESMM4 AI Assistant</p>
        </footer>
      </main>
    </div>
  );
}
