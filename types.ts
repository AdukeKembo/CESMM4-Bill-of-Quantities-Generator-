
export interface BoQItem {
  itemNumber: string;
  description: string;
  unit: string;
  quantity: number; // Original Qty
  rate: number;
  originalPrice: number; // Original Amount
  revisedQuantity: number | string;
  revisedPrice: number;
  savings: number;
  comments: string;
}

export interface UploadedFile {
  data: string; // Base64 string
  mimeType: string;
  name: string;
}
