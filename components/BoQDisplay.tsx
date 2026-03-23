import React from 'react';
import Card from './ui/Card';
import Spinner from './ui/Spinner';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { BoQItem } from '../types';
import { GenerationStatus } from '../App';
import { exportBoqToExcel } from '../utils/excelGenerator';

interface BoQDisplayProps {
  status: GenerationStatus;
  error: string | null;
  items: BoQItem[];
  onRateChange: (index: number, rate: number) => void;
  onRevisedQuantityChange: (index: number, revisedQty: string) => void;
  onCommentsChange: (index: number, comments: string) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
  conversionRate: number;
  isCurrencyLoading: boolean;
}

const CURRENCIES = [
    { code: 'KES', name: 'Kenya Shilling' },
    { code: 'USD', name: 'United States Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound Sterling' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'CHF', name: 'Swiss Franc' },
    { code: 'CNY', name: 'Chinese Yuan' },
    { code: 'INR', name: 'Indian Rupee' },
];

export default function BoQDisplay({ status, error, items, onRateChange, onRevisedQuantityChange, onCommentsChange, currency, onCurrencyChange, conversionRate, isCurrencyLoading }: BoQDisplayProps): React.ReactNode {

  // Totals are calculated from base currency values and converted for display
  const totalOriginal = items.reduce((acc, item) => acc + item.originalPrice, 0);
  const totalRevised = items.reduce((acc, item) => acc + item.revisedPrice, 0);
  const totalSavings = items.reduce((acc, item) => acc + item.savings, 0);

  const handleDownload = () => {
    // Convert all monetary values to the selected currency for export
    const convertedItems = items.map(item => ({
      ...item,
      rate: item.rate * conversionRate,
      originalPrice: item.originalPrice * conversionRate,
      revisedPrice: item.revisedPrice * conversionRate,
      savings: item.savings * conversionRate,
    }));
    exportBoqToExcel(convertedItems, `Bill_of_Quantities_${currency}.xlsx`, currency);
  };
  
  const formatCurrency = (amount: number) => {
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    } catch (e) {
        // Fallback for currencies not supported by Intl (less common now)
        return `${amount.toFixed(2)} ${currency}`;
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center min-h-[30rem]">
            <Spinner />
            <p className="mt-4 text-slate-600 dark:text-slate-400">AI is generating the BoQ...</p>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center justify-center min-h-[30rem] text-center">
            <div className="w-12 h-12 text-red-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <p className="font-semibold text-red-600 dark:text-red-400">An Error Occurred</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 px-4">{error}</p>
          </div>
        );

      case 'success':
        if (items.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center min-h-[30rem] text-center">
              <p className="font-semibold text-slate-700 dark:text-slate-300">No items generated.</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Please try a more detailed project description.</p>
            </div>
          );
        }
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Item</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unit</th>
                  <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Original Qty</th>
                  <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Revised Qty</th>
                  <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rate ({currency})</th>
                  <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Original Amount ({currency})</th>
                  <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Revised Amount ({currency})</th>
                  <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Savings/Overrun ({currency})</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Comments</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-200">{item.itemNumber}</td>
                    <td className="px-3 py-2 whitespace-normal text-sm text-slate-600 dark:text-slate-300 max-w-sm">{item.description}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{item.unit}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 text-right">{item.quantity.toFixed(2)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm"><Input type="number" aria-label={`Revised quantity for item ${item.itemNumber}`} value={item.revisedQuantity} onChange={(e) => onRevisedQuantityChange(index, e.target.value)} className="w-24 text-right" placeholder="0.00" min="0" step="0.01" disabled={isCurrencyLoading}/></td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm"><Input type="number" aria-label={`Rate for item ${item.itemNumber}`} value={item.rate > 0 ? (item.rate * conversionRate).toFixed(2) : ''} onChange={(e) => onRateChange(index, parseFloat(e.target.value) || 0)} className="w-28 text-right" placeholder="0.00" min="0" step="0.01" disabled={isCurrencyLoading}/></td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 text-right font-semibold">{formatCurrency(item.originalPrice * conversionRate)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200 text-right font-semibold">{formatCurrency(item.revisedPrice * conversionRate)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-semibold" style={{color: (item.savings * conversionRate) < 0 ? '#ef4444' : '#22c55e'}}>{formatCurrency(item.savings * conversionRate)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm"><Input type="text" aria-label={`Comments for item ${item.itemNumber}`} value={item.comments} onChange={(e) => onCommentsChange(index, e.target.value)} className="w-48" disabled={isCurrencyLoading}/></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-700/50 sticky bottom-0">
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-200 uppercase">Total</td>
                  <td className="px-3 py-3 text-right text-sm font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalOriginal * conversionRate)}</td>
                  <td className="px-3 py-3 text-right text-sm font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalRevised * conversionRate)}</td>
                  <td className="px-3 py-3 text-right text-sm font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalSavings * conversionRate)}</td>
                  <td className="px-3 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        );

      case 'idle':
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[30rem] text-center">
            <div className="w-16 h-16 text-slate-400 dark:text-slate-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5l3 3m0 0l3-3m-3 3v-6m1.06-4.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
            <p className="font-semibold text-slate-700 dark:text-slate-300">Your interactive BoQ will appear here</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter a project description to get started.</p>
          </div>
        );
    }
  };
  
  return (
    <Card className="max-h-[80vh] flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Bill of Quantities</h2>
        <div className="flex items-center gap-2">
          {isCurrencyLoading && <Spinner className="h-5 w-5 text-blue-500"/>}
          <Select
              id="currency-select"
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              aria-label="Select Currency"
              disabled={isCurrencyLoading}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
              ))}
          </Select>
          {status === 'success' && items.length > 0 && (
            <Button onClick={handleDownload} variant="primary" size="sm" disabled={isCurrencyLoading}>
              Download .xlsx
            </Button>
          )}
        </div>
      </div>
      <div className="flex-grow overflow-y-auto">
        {renderContent()}
      </div>
    </Card>
  );
}