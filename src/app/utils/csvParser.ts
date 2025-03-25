import Papa from 'papaparse';

export interface ParsedData {
  x: number;
  y: number;
  [key: string]: any;
}

export function validateCSVFormat(data: any[]): boolean {
  // Check if we have at least one row
  if (!data || data.length === 0) {
    return false;
  }
  
  // Check that we have at least two columns with potential number values
  if (Object.keys(data[0]).length < 2) {
    return false;
  }
  
  return true;
}

export function parseCSVData(data: any[]): ParsedData[] {
  const headers = Object.keys(data[0]);
  
  // Use the first two columns as x and y
  const xHeader = headers[0];
  const yHeader = headers[1];
  
  // Check if data has negative values to determine quadrant mode
  let hasNegativeX = false;
  let hasNegativeY = false;
  
  const result = data.map(row => {
    const x = parseFloat(row[xHeader]);
    const y = parseFloat(row[yHeader]);
    
    // Check for negative values
    if (x < 0) hasNegativeX = true;
    if (y < 0) hasNegativeY = true;
    
    // Create data point with all columns
    const point: ParsedData = { x, y };
    
    // Add all other columns as additional properties
    headers.forEach(header => {
      if (header !== xHeader && header !== yHeader) {
        point[header] = row[header];
      }
    });
    
    return point;
  }).filter(point => !isNaN(point.x) && !isNaN(point.y));
  
  // Helper function to round domain values nicely
  const roundDomainValue = (value: number, isMin: boolean): number => {
    // Round to nice numbers that are multiples of 5 or 10
    if (value === 0) return 0;
    
    const absValue = Math.abs(value);
    const magnitude = Math.pow(10, Math.floor(Math.log10(absValue)));
    
    if (isMin) {
      // For minimum values, round down
      return Math.floor(value / magnitude) * magnitude;
    } else {
      // For maximum values, round up
      return Math.ceil(value / magnitude) * magnitude;
    }
  };
  
  // Get min/max values
  const xMin = Math.min(...result.map(point => point.x));
  const xMax = Math.max(...result.map(point => point.x));
  const yMin = Math.min(...result.map(point => point.y));
  const yMax = Math.max(...result.map(point => point.y));
  
  // Calculate if we need to use four quadrants
  const shouldUseFourQuadrants = xMin < 0 || yMin < 0;
  
  // Calculate rounded domain values
  let domains;
  if (shouldUseFourQuadrants) {
    // For four quadrants, ensure we include zero and round outward
    domains = {
      xMin: roundDomainValue(xMin, true),
      xMax: roundDomainValue(xMax, false),
      yMin: roundDomainValue(yMin, true),
      yMax: roundDomainValue(yMax, false)
    };
  } else {
    // For first quadrant only
    domains = {
      xMin: 0,
      xMax: roundDomainValue(xMax, false),
      yMin: 0,
      yMax: roundDomainValue(yMax, false)
    };
  }
  
  // Add metadata to the first data point (for processing in page.tsx)
  if (result.length > 0) {
    result[0].quadrantMode = shouldUseFourQuadrants ? 'all' : 'first';
    result[0].domains = domains;
  }
  
  return result;
}

export function parseCSVFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
} 