import * as XLSX from 'xlsx';

export interface PaymentData {
  unitNumber: string;
  unitDescription?: string;
  paid: boolean;
  amount?: number;
  paymentDate?: Date;
  status?: string;
}

export interface ExcelAnalysisResult {
  totalUnits: number;
  paidUnits: number;
  defaultUnits: number;
  defaultRate: number;
  paidUnitsList: string[];
  defaultUnitsList: string[];
  totalAmount?: number;
  paidAmount?: number;
  defaultAmount?: number;
  payments: PaymentData[];
}

export class ExcelProcessor {
  
  processPaymentFile(fileBuffer: Buffer): ExcelAnalysisResult {
    try {
      // Read Excel file
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      console.log('Excel data preview (first 5 rows):', data.slice(0, 5));
      
      return this.analyzePaymentData(data);
    } catch (error) {
      console.error('Error processing Excel file:', error);
      throw new Error('Erro ao processar arquivo Excel');
    }
  }
  
  private analyzePaymentData(data: any[][]): ExcelAnalysisResult {
    const payments: PaymentData[] = [];
    const paidUnits: string[] = [];
    let totalAmount = 0;
    let paidAmount = 0;
    
    // This appears to be a "Demonstrativo de Liquidação de Títulos" (francesinha)
    // All entries in this report are PAID units (liquidated titles)
    
    // Look for data rows with payment information
    // Skip header rows and find actual payment data
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      // Look for rows that contain unit identification and payment data
      let unitInfo = '';
      let amountValue = 0;
      let hasValidData = false;
      
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').trim();
        
        // Look for unit patterns like "BL01 AP01", "Lote 001", etc.
        if (this.looksLikeUnitIdentifier(cell)) {
          unitInfo = cell;
          hasValidData = true;
        }
        
        // Look for monetary values
        if (this.looksLikeAmount(cell)) {
          const parsedAmount = this.parseAmount(cell);
          if (parsedAmount > amountValue) {
            amountValue = parsedAmount;
            hasValidData = true;
          }
        }
      }
      
      // If we found both unit info and amount, this is a payment record
      if (hasValidData && unitInfo && amountValue > 0) {
        const unitNumber = this.extractUnitNumber(unitInfo);
        if (unitNumber && !paidUnits.includes(unitNumber)) {
          const payment: PaymentData = {
            unitNumber,
            unitDescription: unitInfo,
            paid: true, // All entries in francesinha are paid
            amount: amountValue,
            status: 'Pago'
          };
          
          payments.push(payment);
          paidUnits.push(unitNumber);
          paidAmount += amountValue;
          totalAmount += amountValue;
        }
      }
    }
    
    // For francesinha reports, we need to estimate total units
    // Since this only shows paid units, we need to make reasonable assumptions
    const totalUnits = Math.max(paidUnits.length, 200); // Assume at least 200 units for "Morada Nobre"
    const paidUnitsCount = paidUnits.length;
    const defaultUnitsCount = totalUnits - paidUnitsCount;
    const defaultRate = totalUnits > 0 ? (defaultUnitsCount / totalUnits) * 100 : 0;
    
    // Generate list of likely defaulting units (estimated)
    const defaultUnits = this.generateMissingUnits(paidUnits, totalUnits);
    
    console.log(`Francesinha analysis complete: ${paidUnitsCount} paid units found, estimated ${defaultUnitsCount} default units, ${defaultRate.toFixed(2)}% default rate`);
    
    return {
      totalUnits,
      paidUnits: paidUnitsCount,
      defaultUnits: defaultUnitsCount,
      defaultRate,
      paidUnitsList: paidUnits.sort(),
      defaultUnitsList: defaultUnits.sort(),
      totalAmount,
      paidAmount,
      defaultAmount: totalAmount - paidAmount,
      payments
    };
  }
  
  private looksLikeUnitIdentifier(text: string): boolean {
    if (!text || text.length < 2) return false;
    
    const patterns = [
      /BL\s*\d+\s*AP\s*\d+/i,
      /BLOCO\s*\d+\s*APT\s*\d+/i,
      /LOTE\s*\d+/i,
      /APT\s*\d+/i,
      /UNIDADE\s*\d+/i,
      /^[AB]\d{3}$/i, // A001, B123 format
      /^\d{3,4}$/    // 101, 1201 format
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }
  
  private looksLikeAmount(text: string): boolean {
    if (!text) return false;
    
    // Check if it looks like a monetary value
    return /^R?\$?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?$/.test(text.replace(/\s/g, ''));
  }
  
  private generateMissingUnits(paidUnits: string[], totalUnits: number): string[] {
    // Generate the complete list using the proper QAL01, QBL02, etc. format
    // Based on the Condominio Morada Nobre pattern provided by the user
    
    const allUnits: string[] = [];
    const paidSet = new Set(paidUnits.map(unit => this.normalizeUnitToQFormat(unit)));
    
    // Define all quadras and their respective unit counts
    const quadraUnits = [
      { prefix: 'QA', count: 34 }, // QAL01-QAL34
      { prefix: 'QB', count: 36 }, // QBL01-QBL36
      { prefix: 'QC', count: 26 }, // QCL01-QCL26
      { prefix: 'QD', count: 7 },  // QDL01-QDL07
      { prefix: 'QE', count: 33 }, // QEL01-QEL33
      { prefix: 'QF', count: 35 }, // QFL01-QFL35
      { prefix: 'QG', count: 17 }, // QGL01-QGL17
      { prefix: 'QH', count: 15 }, // QHL01-QHL15
      { prefix: 'QI', count: 6 }   // QIL01-QIL06
    ];
    
    // Generate all possible units
    for (const quadra of quadraUnits) {
      for (let i = 1; i <= quadra.count; i++) {
        const unitNumber = `${quadra.prefix}L${i.toString().padStart(2, '0')}`;
        allUnits.push(unitNumber);
      }
    }
    
    // Return only the units that are NOT in the paid list (defaulting units)
    const defaultUnits = allUnits.filter(unit => !paidSet.has(unit));
    
    return defaultUnits.sort();
  }
  
  private normalizeUnitToQFormat(unit: string): string {
    // Convert various unit formats to the Q format (QAL01, QBL02, etc.)
    
    // If already in Q format, return as is
    if (/^Q[A-I]L\d{2}$/.test(unit)) {
      return unit;
    }
    
    // Handle formats like "2-14" -> map to QB format
    const blockAptMatch = unit.match(/^(\d+)-(\d+)$/);
    if (blockAptMatch) {
      const block = parseInt(blockAptMatch[1]);
      const apt = parseInt(blockAptMatch[2]);
      
      // Simple mapping based on block number to quadra
      const quadraMap: { [key: number]: string } = {
        1: 'QA', 2: 'QB', 3: 'QC', 4: 'QD', 5: 'QE',
        6: 'QF', 7: 'QG', 8: 'QH', 9: 'QI', 10: 'QA'
      };
      
      const quadra = quadraMap[block] || 'QB'; // Default to QB if not found
      return `${quadra}L${apt.toString().padStart(2, '0')}`;
    }
    
    // For other formats, try to extract numbers and map to QB (most common)
    const numberMatch = unit.match(/(\d+)/);
    if (numberMatch) {
      const num = parseInt(numberMatch[1]);
      return `QBL${num.toString().padStart(2, '0')}`;
    }
    
    // Default fallback
    return unit;
  }
  
  private extractUnitNumber(unitValue: string): string | null {
    // Extract unit number from various formats
    const cleanValue = unitValue.replace(/[^\w\d]/g, '');
    
    // Look for patterns like "BL01AP01", "Lote01", "Apt101", etc.
    const patterns = [
      /BL(\d+)AP(\d+)/i,     // BL01AP01 -> 01-01
      /(\d+)(\d{2})$/,       // 101 -> 1-01
      /LOTE\s*(\d+)/i,       // Lote 1 -> 1
      /APT\s*(\d+)/i,        // Apt 101 -> 101
      /^(\d+)$/,             // Just number
    ];
    
    for (const pattern of patterns) {
      const match = unitValue.match(pattern);
      if (match) {
        if (match.length === 3) {
          // Block and apartment format
          return `${match[1]}-${match[2]}`;
        } else {
          return match[1];
        }
      }
    }
    
    // If no pattern matches, return cleaned value if it contains numbers
    if (/\d/.test(cleanValue)) {
      return cleanValue;
    }
    
    return null;
  }
  
  private parseAmount(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    const str = String(value).replace(/[R$\s.,]/g, '');
    const num = parseFloat(str) || 0;
    
    // If the number seems too small, it might be in cents format
    return num < 1000 ? num : num / 100;
  }
  
  private isPaid(statusValue: string, amount: number): boolean {
    const status = statusValue.toLowerCase();
    
    // Check for explicit payment indicators
    if (status.includes('pago') || status.includes('quitado') || status.includes('sim')) {
      return true;
    }
    
    if (status.includes('não') || status.includes('pendente') || status.includes('devendo')) {
      return false;
    }
    
    // If amount > 0 and no explicit "não pago", assume paid
    return amount > 0;
  }
}

export const excelProcessor = new ExcelProcessor();