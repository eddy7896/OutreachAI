import * as XLSX from 'xlsx';
import { Lead } from '@/types';

// Expected headers based on user specs (case-insensitive mapping later)
const EXPECTED_HEADERS = [
  'Target Product',
  'Industry',
  'First Name',
  'Last Name',
  'Company',
  'Job Title',
  'Email',
  'Phone Number',
  'Remarks'
];

export async function parseExcelFile(file: File): Promise<Partial<Lead>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of objects
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (rawData.length < 2) {
          throw new Error('File appears to be empty or missing data rows.');
        }

        const headers: string[] = rawData[0].map((h: any) => String(h).trim().toLowerCase());
        const leads: Partial<Lead>[] = [];

        // Map column names to our expected properties flexibly
        const getColumnIndex = (possibleNames: string[]) => {
          return headers.findIndex(h => possibleNames.some(p => h.includes(p.toLowerCase())));
        };

        const colMap = {
          targetProduct: getColumnIndex(['target product', 'product', 'service']),
          industry: getColumnIndex(['industry', 'sector']),
          firstName: getColumnIndex(['first name', 'firstname', 'first']),
          lastName: getColumnIndex(['last name', 'lastname', 'last']),
          company: getColumnIndex(['company', 'organization', 'account']),
          jobTitle: getColumnIndex(['job title', 'title', 'role']),
          email: getColumnIndex(['email']),
          phone: getColumnIndex(['phone', 'mobile']),
          remarks: getColumnIndex(['remark', 'note', 'comment'])
        };

        // Check required fields (at least email is critically required)
        if (colMap.email === -1) {
          throw new Error('Required column "Email" not found in the spreadsheet.');
        }

        // Process rows
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;

          // Helper to safely get string value
          const getVal = (index: number) => index !== -1 && row[index] ? String(row[index]).trim() : '';

          const email = getVal(colMap.email);
          if (!email) continue; // Skip rows without email

          leads.push({
            targetProduct: getVal(colMap.targetProduct),
            industry: getVal(colMap.industry),
            firstName: getVal(colMap.firstName),
            lastName: getVal(colMap.lastName),
            company: getVal(colMap.company),
            jobTitle: getVal(colMap.jobTitle),
            email,
            phone: getVal(colMap.phone),
            remarks: getVal(colMap.remarks),
            status: 'new'
          });
        }

        resolve(leads);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}
