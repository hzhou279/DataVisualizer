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
  try {
    // Check if data is valid
    if (!data || !Array.isArray(data) || data.length === 0 || !data[0]) {
      console.warn("Invalid data passed to parseCSVData");
      return [];
    }
    
    const headers = Object.keys(data[0]);
    
    // Validate headers exist
    if (!headers || headers.length < 2) {
      console.warn("CSV data has insufficient columns");
      return [];
    }
    
    // Use the first two columns as x and y
    const xHeader = headers[0];
    const yHeader = headers[1];
    
    // Check if data has negative values to determine quadrant mode
    let hasNegativeX = false;
    let hasNegativeY = false;
    
    const result = data
      .filter(row => row !== null && row !== undefined) // Filter out null/undefined rows
      .map(row => {
        try {
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
        } catch (err) {
          console.warn("Error parsing row in CSV data:", err);
          // Return a point with NaN values that will be filtered out
          return { x: NaN, y: NaN };
        }
      })
      .filter(point => 
        // Filter out invalid points
        !isNaN(point.x) && 
        !isNaN(point.y) && 
        isFinite(point.x) && 
        isFinite(point.y)
      );
    
    // If no valid points were found, return empty array
    if (result.length === 0) {
      console.warn("No valid data points found in CSV");
      return [];
    }
    
    // Get min/max values safely
    const xValues = result.map(point => point.x);
    const yValues = result.map(point => point.y);
    
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    
    // Check for invalid min/max values
    if (!isFinite(xMin) || !isFinite(xMax) || !isFinite(yMin) || !isFinite(yMax)) {
      console.warn("Invalid min/max values calculated from data");
      // Return data without domain information
      return result;
    }
    
    // Calculate if we need to use four quadrants
    const shouldUseFourQuadrants = xMin < 0 || yMin < 0;
    
    // Calculate domain values with the specified requirements
    let domains;
    if (shouldUseFourQuadrants) {
      // For negative values: use fixed range [-2500, 2500] for both axes
      domains = {
        xMin: -2500,
        xMax: 2500,
        yMin: -2500,
        yMax: 2500
      };
    } else {
      // For non-negative values: range should be [0, 5000]
      domains = {
        xMin: 0,
        xMax: 5000,
        yMin: 0, 
        yMax: 5000
      };
    }
    
    // Add metadata to the first data point (for processing in page.tsx)
    if (result.length > 0) {
      result[0].quadrantMode = shouldUseFourQuadrants ? 'all' : 'first';
      result[0].domains = domains;
    }
    
    return result;
  } catch (error) {
    console.error("Error in parseCSVData:", error);
    return [];
  }
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