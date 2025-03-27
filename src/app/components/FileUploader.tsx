'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { validateCSVFormat, parseCSVData } from '../utils/csvParser';
import { ParsedData } from '../utils/csvParser';
import React from 'react';

interface FileUploaderProps {
  onDataParsed: (data: ParsedData[], fileName: string) => void;
}

export default function FileUploader({ onDataParsed }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log(`Processing file: ${file.name}, type: ${file.type}`);
    setIsUploading(true);
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = file.name.split('.')[0];
    
    try {
      if (fileExt === 'csv') {
        console.log('Processing as CSV file');
        processCSVFile(file, fileName);
      } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        console.log('Processing as Excel file');
        processExcelFile(file, fileName);
      } else {
        alert('Unsupported file format. Please upload a CSV, XLSX, or XLS file.');
        setIsUploading(false);
        resetFileInput();
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again with a valid file.');
      setIsUploading(false);
      resetFileInput();
    }
  };

  // Function to reset the file input
  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processCSVFile = (file: File, fileName: string) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        if (!validateCSVFormat(results.data)) {
          alert('Invalid CSV format. Please ensure your file has at least two columns of numeric data.');
          setIsUploading(false);
          resetFileInput();
          return;
        }
        
        const parsedData = parseCSVData(results.data);
        if (parsedData.length === 0) {
          alert('No valid data points found in the file. Please ensure your file contains numeric data.');
          setIsUploading(false);
          resetFileInput();
          return;
        }
        
        onDataParsed(parsedData, fileName);
        setIsUploading(false);
        resetFileInput();
      },
      error: () => {
        alert('Error parsing CSV file. Please check the file format.');
        setIsUploading(false);
        resetFileInput();
      }
    });
  };

  // Alternative Excel parsing method in case the main one fails
  const fallbackProcessExcelFile = (file: File, fileName: string) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('No data read from file');
        
        // Parse Excel
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        
        // Get worksheet
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert directly to JSON with headers from first row
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (!jsonData || jsonData.length === 0) {
          alert('No data found in the Excel file.');
          setIsUploading(false);
          resetFileInput();
          return;
        }
        
        // Check if the data has the expected structure
        if (!validateCSVFormat(jsonData)) {
          alert('Invalid Excel format. Please ensure your file has at least two columns of numeric data.');
          setIsUploading(false);
          resetFileInput();
          return;
        }
        
        // Parse the data
        const parsedData = parseCSVData(jsonData);
        
        if (parsedData.length === 0) {
          alert('No valid data points found in the file. Please ensure your file contains numeric data.');
          setIsUploading(false);
          resetFileInput();
          return;
        }
        
        onDataParsed(parsedData, fileName);
        setIsUploading(false);
        resetFileInput();
      } catch (error) {
        console.error('Error in fallback Excel parsing:', error);
        alert('Could not parse the Excel file. Please ensure the file is a valid Excel file with numeric data.');
        setIsUploading(false);
        resetFileInput();
      }
    };
    
    reader.onerror = () => {
      alert('Error reading Excel file.');
      setIsUploading(false);
      resetFileInput();
    };
    
    reader.readAsBinaryString(file);
  };

  const processExcelFile = (file: File, fileName: string) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const data = e.target?.result;
        if (!data) {
          alert('Error reading Excel file.');
          setIsUploading(false);
          resetFileInput();
          return;
        }
        
        try {
          // Parse the Excel file - using 'array' type instead of 'binary'
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first worksheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON with headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 'A' });
          
          // Process the data from Excel format
          if (jsonData.length <= 1) { // Check if there's only a header row or no data
            alert('No data found in the Excel file. Please ensure your file contains data.');
            setIsUploading(false);
            resetFileInput();
            return;
          }
          
          // Convert Excel data format (first row as headers) to the format expected by validateCSVFormat
          const headers = jsonData[0] as Record<string, any>;
          const rows = jsonData.slice(1) as Record<string, any>[];
          const formattedData = rows.map(row => {
            const obj: Record<string, any> = {};
            Object.keys(row).forEach(key => {
              const headerKey = headers[key];
              obj[headerKey] = row[key];
            });
            return obj;
          });
          
          if (!validateCSVFormat(formattedData)) {
            alert('Invalid Excel format. Please ensure your file has at least two columns of numeric data.');
            setIsUploading(false);
            resetFileInput();
            return;
          }
          
          const parsedData = parseCSVData(formattedData);
          if (parsedData.length === 0) {
            alert('No valid data points found in the file. Please ensure your file contains numeric data.');
            setIsUploading(false);
            resetFileInput();
            return;
          }
          
          onDataParsed(parsedData, fileName);
          setIsUploading(false);
          resetFileInput();
        } catch (error) {
          console.error('Error parsing Excel file with primary method:', error);
          // Try fallback method
          fallbackProcessExcelFile(file, fileName);
        }
      };
      
      reader.onerror = () => {
        alert('Error reading Excel file.');
        setIsUploading(false);
        resetFileInput();
      };
      
      // Use readAsArrayBuffer instead of readAsBinaryString
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Exception in primary Excel processing:', error);
      // Try fallback method on any exception
      fallbackProcessExcelFile(file, fileName);
    }
  };

  return (
    <div className="relative overflow-hidden p-0.5 rounded-lg shadow-sm">
      <label className="flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium cursor-pointer transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {isUploading ? 'Uploading...' : 'Upload CSV/Excel'}
        <input 
          ref={fileInputRef}
          type="file" 
          className="hidden" 
          accept=".csv,.xlsx,.xls" 
          onChange={handleFileChange} 
          disabled={isUploading}
        />
      </label>
    </div>
  );
} 