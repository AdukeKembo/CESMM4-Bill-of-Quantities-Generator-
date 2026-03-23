
import * as XLSX from 'xlsx';
import { BoQItem } from '../types';

const CESMM4_CLASSES: { [key: string]: string } = {
    'A': 'Class A - General Items',
    'B': 'Class B - Ground Investigation',
    'C': 'Class C - Geotechnical and other Specialist Processes',
    'D': 'Class D - Demolition and Site Clearance',
    'E': 'Class E - Earthworks',
    'F': 'Class F - In-situ Concrete',
    'G': 'Class G - Concrete Ancillaries',
    'H': 'Class H - Precast Concrete',
    'I': 'Class I - Pipework - Pipes',
    'J': 'Class J - Pipework - Fittings and Valves',
    'K': 'Class K - Pipework - Manholes and Ancillary Chambers',
    'L': 'Class L - Pipework - Supports and Protection, Ancillaries to Laying and Excavation',
    'M': 'Class M - Structural Metalwork',
    'N': 'Class N - Miscellaneous Metalwork',
    'O': 'Class O - Timber',
    'P': 'Class P - Piles',
    'Q': 'Class Q - Piling Ancillaries',
    'R': 'Class R - Roads and Pavings',
    'S': 'Class S - Rail Track',
    'T': 'Class T - Tunnels',
    'U': 'Class U - Brickwork, Blockwork and Masonry',
    'V': 'Class V - Painting',
    'W': 'Class W - Waterproofing',
    'X': 'Class X - Miscellaneous Work',
    'Y': 'Class Y - Sewer and Water Main Renovation and Ancillary Works',
    'Z': 'Class Z - Simple Building Works Incidental to Civil Engineering Works',
};

const getClassName = (itemNumber: string): string => {
    const classLetter = itemNumber.charAt(0).toUpperCase();
    return CESMM4_CLASSES[classLetter] || `Class ${classLetter} - Unclassified`;
};

const applyFormatting = (worksheet: XLSX.WorkSheet, col_names: string[], dataLength: number, hasTotal: boolean) => {
    const numberFormat = '#,##0.00';
    const totalRows = dataLength + (hasTotal ? 2 : 1);

    const currencyCols = col_names.filter(c => c.includes('(') && c.includes(')'));
    const qtyCols = col_names.filter(c => c.toLowerCase().includes('qty'));

    for (let R = 1; R < totalRows; ++R) { // Start from row 2 (index 1)
        for (const colName of [...currencyCols, ...qtyCols]) {
            const C = col_names.indexOf(colName);
            if (C > -1) {
                const cell = worksheet[XLSX.utils.encode_cell({c: C, r: R})];
                if (cell && cell.t === 'n') {
                    cell.z = numberFormat;
                }
            }
        }
    }
};

export function exportBoqToExcel(data: BoQItem[], fileName: string, currency: string): void {
  const workbook = XLSX.utils.book_new();

  const groupedByClass = data.reduce((acc, item) => {
    if (!item.itemNumber) return acc;
    const classLetter = item.itemNumber.charAt(0).toUpperCase();
    if (!acc[classLetter]) acc[classLetter] = [];
    acc[classLetter].push(item);
    return acc;
  }, {} as { [key: string]: BoQItem[] });

  const rateHeader = `Rate (${currency})`;
  const originalAmountHeader = `Original Amount (${currency})`;
  const revisedAmountHeader = `Revised Amount (${currency})`;
  const savingsHeader = `Savings/Overrun (${currency})`;
  
  const summaryData: any[] = [];
  let grandTotalOriginal = 0;
  let grandTotalRevised = 0;
  let grandTotalSavings = 0;
  
  const sortedClasses = Object.keys(groupedByClass).sort((a, b) => a.localeCompare(b));

  for (const classLetter of sortedClasses) {
    const items = groupedByClass[classLetter];
    const className = getClassName(items[0].itemNumber);
    const sheetName = className.replace(/[\\/*?[\]:]/g, "").substring(0, 31);

    const worksheetData = items.map(item => ({
      'Item': item.itemNumber,
      'Description': item.description,
      'Unit': item.unit,
      'Original Qty': item.quantity,
      'Revised Qty': typeof item.revisedQuantity === 'string' && item.revisedQuantity === '' ? null : Number(item.revisedQuantity),
      [rateHeader]: item.rate,
      [originalAmountHeader]: item.originalPrice,
      [revisedAmountHeader]: item.revisedPrice,
      [savingsHeader]: item.savings,
      'Comments': item.comments,
    }));

    const classSubTotalOriginal = items.reduce((sum, item) => sum + item.originalPrice, 0);
    const classSubTotalRevised = items.reduce((sum, item) => sum + item.revisedPrice, 0);
    const classSubTotalSavings = items.reduce((sum, item) => sum + item.savings, 0);

    grandTotalOriginal += classSubTotalOriginal;
    grandTotalRevised += classSubTotalRevised;
    grandTotalSavings += classSubTotalSavings;
    
    summaryData.push({ 
        'Description': className, 
        [originalAmountHeader]: classSubTotalOriginal,
        [revisedAmountHeader]: classSubTotalRevised,
        [savingsHeader]: classSubTotalSavings
    });

    const classHeader = ['Item', 'Description', 'Unit', 'Original Qty', 'Revised Qty', rateHeader, originalAmountHeader, revisedAmountHeader, savingsHeader, 'Comments'];
    const worksheet = XLSX.utils.json_to_sheet(worksheetData, { header: classHeader });
    
    const subTotalRow = {
        'Description': 'Sub-total for ' + className,
        [originalAmountHeader]: classSubTotalOriginal,
        [revisedAmountHeader]: classSubTotalRevised,
        [savingsHeader]: classSubTotalSavings,
    };
    XLSX.utils.sheet_add_json(worksheet, [subTotalRow], { skipHeader: true, origin: -1 });

    worksheet['!cols'] = [
        { wch: 12 }, // Item
        { wch: 50 }, // Description
        { wch: 8 },  // Unit
        { wch: 12 }, // Original Qty
        { wch: 12 }, // Revised Qty
        { wch: 15 }, // Rate
        { wch: 18 }, // Original Amount
        { wch: 18 }, // Revised Amount
        { wch: 18 }, // Savings/Overrun
        { wch: 40 }, // Comments
    ];
    
    applyFormatting(worksheet, classHeader, items.length, true);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  const summaryHeader = ['Description', originalAmountHeader, revisedAmountHeader, savingsHeader];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData, { header: summaryHeader });
  
  const grandTotalRow = {
      'Description': 'GRAND TOTAL',
      [originalAmountHeader]: grandTotalOriginal,
      [revisedAmountHeader]: grandTotalRevised,
      [savingsHeader]: grandTotalSavings,
  };
  XLSX.utils.sheet_add_json(summarySheet, [grandTotalRow], { skipHeader: true, origin: -1 });
  
  summarySheet['!cols'] = [{ wch: 50 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
  applyFormatting(summarySheet, summaryHeader, summaryData.length, true);

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  if (workbook.SheetNames.length > 1) {
    const summarySheetName = workbook.SheetNames.pop()!;
    workbook.SheetNames.unshift(summarySheetName);
  }

  XLSX.writeFile(workbook, fileName);
}
