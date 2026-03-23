
import React, { useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import Textarea from './ui/Textarea';
import Spinner from './ui/Spinner';
import { CheckIcon } from './icons/CheckIcon';
import { UploadedFile } from '../types';

interface InputFormProps {
  onGenerate: (description: string, files: UploadedFile[]) => void;
  isLoading: boolean;
}

const exampleText = `Construction of 1.No. raw water Intake Works at Lake Kanyaboli to include raw water pumphouse
Laying of 250m DN 200 epoxy coated steel screened intake pipe from lake kanyaboli to raw water pump house, from pumphouse to t-works
Construction 1Nr. 2,000 m³/day water treatment plant and associated works
Construction of 1Nr. 2,000 m³/day water treatment plant and associated works (Additional Capacity)
Laying of 8Km Clear water pumping mains HDPE 315 mm to Akara Hill and Kanyaboli Primary Storage tanks respectively
Construction of a 500 cubic meter RCC clear water tank at the treatment plant
Construction of a 500 cubic meter RCC clear water tank at Kanyaboli Primary School
Construction of a 500 cubic meter RCC clear water tank at Akara Hill
Installation of a 200 cubic meter Elevated Tank at Boro Market
Laying of Distribution - Component A-Transmission Mains to Boro Market, Segere, Kanyaboli and Kadenge
Laying of Distribution lines - Component B--Last Mile Connectivity pipes (OD63-160)
Installation of Solar Pumping System for raw water and treated water mains
Installed Pumpsets and accesories-2nr Low Lift, 6nr High Lift
Construction of 1 Nr. Ablution Block
Constructed 3Nr. Water kiosks
Installation of Decentralised Waste Water Treatment System
Supply and Installation of 10 Nr.Atmospheric Water Generators to produce 5,000l of water per day 380v/50Hz, Compressor: 2 x 47.3kW, Working Humidity: 45-
95%, Working Temperature: 20-32°C, Refrigerant: R407c
Undertaking of Site Activities and Ancillary Works
Undertaking of Electromechanical Works`;

export default function InputForm({ onGenerate, isLoading }: InputFormProps): React.ReactNode {
  const [description, setDescription] = useState<string>('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isReading, setIsReading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(description, files);
  };
  
  const handleUseExample = () => {
    setDescription(exampleText);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSuccessMsg(null);
    if (e.target.files && e.target.files.length > 0) {
        setIsReading(true);
        const selectedFiles: File[] = Array.from(e.target.files);
        const newFiles: UploadedFile[] = [];

        // Simple limit to prevent sending too much data in client-side request
        if (files.length + selectedFiles.length > 5) {
            alert("Maximum 5 files allowed.");
            setIsReading(false);
            e.target.value = '';
            return;
        }

        try {
            for (const file of selectedFiles) {
                if (file.size > 5 * 1024 * 1024) { // 5MB limit check per file
                    alert(`File ${file.name} is too large. Max size is 5MB.`);
                    continue;
                }

                 const base64 = await new Promise<string>((resolve, reject) => {
                     const reader = new FileReader();
                     reader.onloadend = () => {
                         const result = reader.result as string;
                         // remove data:image/png;base64, prefix to get raw base64
                         const base64Data = result.split(',')[1];
                         resolve(base64Data);
                     };
                     reader.onerror = reject;
                     reader.readAsDataURL(file);
                 });
                 
                 newFiles.push({ 
                     data: base64, 
                     mimeType: file.type, 
                     name: file.name 
                 });
            }
            
            if (newFiles.length > 0) {
                setFiles(prev => [...prev, ...newFiles]);
                setSuccessMsg(`Successfully attached ${newFiles.length} file${newFiles.length > 1 ? 's' : ''}.`);
                // Clear success message after 3 seconds
                setTimeout(() => setSuccessMsg(null), 3000);
            }
        } catch (error) {
            console.error("Error reading file", error);
            alert("Failed to process files. Please try again.");
        } finally {
            setIsReading(false);
            // Reset input value so same file can be selected again if removed
            e.target.value = '';
        }
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setSuccessMsg(null);
  };

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">Project Inputs</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Enter the details of the civil engineering works below. You can also attach photos, maps, or design documents (PDF, PNG, JPEG) to help the AI understand the scope better.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Project Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your civil engineering works here (e.g., 'Excavate trench 50m long...')..."
                rows={10}
                disabled={isLoading || isReading}
              />
          </div>

          <div className="mb-6">
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                 Attachments (Photos, Maps, Designs)
             </label>
             <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors relative
                ${isReading 
                    ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/10' 
                    : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
             >
                {isReading ? (
                    <div className="flex flex-col items-center justify-center py-4 space-y-3">
                        <Spinner className="w-8 h-8 text-blue-500" />
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 animate-pulse">
                            Processing files...
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1 text-center">
                        <svg
                            className="mx-auto h-12 w-12 text-slate-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                            aria-hidden="true"
                        >
                            <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <div className="flex text-sm text-slate-600 dark:text-slate-400 justify-center">
                            <label
                                htmlFor="file-upload"
                                className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                            >
                                <span>Upload files</span>
                                <input 
                                    id="file-upload" 
                                    name="file-upload" 
                                    type="file" 
                                    className="sr-only" 
                                    multiple 
                                    accept="image/png, image/jpeg, image/webp, application/pdf"
                                    onChange={handleFileChange}
                                    disabled={isLoading || isReading}
                                />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                            PNG, JPG, PDF up to 5MB
                        </p>
                    </div>
                )}
            </div>

            {/* Success Message */}
            {successMsg && (
                <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm rounded-md flex items-center animate-fade-in">
                    <CheckIcon />
                    <span className="ml-2 font-medium">{successMsg}</span>
                </div>
            )}

            {/* File List */}
            {files.length > 0 && (
                <ul className="mt-4 space-y-2">
                    {files.map((file, index) => (
                        <li key={index} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600">
                            <div className="flex items-center overflow-hidden">
                                <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded-full mr-2">
                                    <CheckIcon />
                                </div>
                                <span className="text-sm text-slate-700 dark:text-slate-200 truncate" title={file.name}>
                                    {file.name}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1 transition-colors"
                                disabled={isLoading || isReading}
                                aria-label="Remove file"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-between items-center">
            <Button
              type="button"
              onClick={handleUseExample}
              disabled={isLoading || isReading}
              variant="secondary"
            >
              Use Text Example
            </Button>
            <Button type="submit" disabled={isLoading || isReading || (!description && files.length === 0)}>
              {isLoading ? 'Generating BoQ...' : 'Generate BoQ'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
