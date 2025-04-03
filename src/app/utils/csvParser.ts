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
    // Handle zero specially
    if (value === 0) return 0;
    
    const absValue = Math.abs(value);
    
    // For values close to nice numbers, don't over-expand the range
    // Calculate a more reasonable magnitude based on the range
    const adjustedMagnitude = Math.pow(10, Math.floor(Math.log10(absValue)));
    
    // If the value is already close to a nice number, use a smaller magnitude
    const normalizedValue = absValue / adjustedMagnitude;
    
    let niceValue;
    
    if (isMin) {
      // For minimum values, round down but don't go too far
      if (normalizedValue < 1.5) {
        // For values < 1.5, round down to nearest integer
        niceValue = Math.floor(normalizedValue) * adjustedMagnitude;
      } else if (normalizedValue < 3) {
        // For values < 3, use the lower multiple of 0.5
        niceValue = Math.floor(normalizedValue * 2) / 2 * adjustedMagnitude;
      } else if (normalizedValue < 7) {
        // For values < 7, use the lower multiple of 1
        niceValue = Math.floor(normalizedValue) * adjustedMagnitude;
      } else {
        // For values >= 7, use the next lower multiple of 5
        niceValue = Math.floor(normalizedValue / 5) * 5 * adjustedMagnitude;
      }
      
      // Apply sign
      niceValue = niceValue * (value < 0 ? -1 : 1);
    } else {
      // For maximum values, round up but don't go too far
      if (normalizedValue <= 1.2) {
        // For values ≤ 1.2, use the next higher multiple of 0.2
        niceValue = Math.ceil(normalizedValue * 5) / 5 * adjustedMagnitude;
      } else if (normalizedValue <= 2) {
        // For values ≤ 2, use the next higher multiple of 0.5
        niceValue = Math.ceil(normalizedValue * 2) / 2 * adjustedMagnitude;
      } else if (normalizedValue <= 5) {
        // For values ≤ 5, use the next integer
        niceValue = Math.ceil(normalizedValue) * adjustedMagnitude;
      } else if (normalizedValue <= 10) {
        // For values ≤ 10, round to next multiple of 2
        niceValue = Math.ceil(normalizedValue / 2) * 2 * adjustedMagnitude;
      } else {
        // For values > 10, round to next multiple of 5
        niceValue = Math.ceil(normalizedValue / 5) * 5 * adjustedMagnitude;
      }
      
      // Apply sign
      niceValue = niceValue * (value < 0 ? -1 : 1);
    }
    
    return niceValue;
  };
  
  // Get min/max values
  const xMin = Math.min(...result.map(point => point.x));
  const xMax = Math.max(...result.map(point => point.x));
  const yMin = Math.min(...result.map(point => point.y));
  const yMax = Math.max(...result.map(point => point.y));
  
  // Calculate if we need to use four quadrants
  const shouldUseFourQuadrants = xMin < 0 || yMin < 0;
  
  // Calculate domain values without rounding
  let domains;
  if (shouldUseFourQuadrants) {
    // For four quadrants, use exact values
    domains = {
      xMin: xMin,
      xMax: xMax,
      yMin: yMin,
      yMax: yMax
    };
  } else {
    // For first quadrant only
    domains = {
      xMin: 0,
      xMax: xMax,
      yMin: 0,
      yMax: yMax
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