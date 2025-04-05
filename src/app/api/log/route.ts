import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

// Route handler for saving debug logs
export async function POST(request: NextRequest) {
  try {
    // Parse the JSON body
    const data = await request.json();
    
    // Create a timestamp for the filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `transform-debug-${timestamp}.json`;
    
    // Specify the log directory path (outside of src)
    // This is important: we need to go up from the current directory (src/app/api/log)
    // to reach the project root, then to the logs directory
    const projectRoot = path.resolve(process.cwd());
    let logDir = path.join(projectRoot, 'logs');
    
    console.log(`Attempting to save log to directory: ${logDir}`);
    
    // Ensure the log directory exists
    try {
      if (!fs.existsSync(logDir)) {
        console.log(`Creating logs directory at: ${logDir}`);
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (dirError) {
      console.error(`Error creating logs directory: ${dirError instanceof Error ? dirError.message : 'Unknown error'}`);
      
      // Try an alternative path if the first one fails
      const altLogDir = path.join(projectRoot, '..', 'logs');
      console.log(`Trying alternative logs directory: ${altLogDir}`);
      
      if (!fs.existsSync(altLogDir)) {
        fs.mkdirSync(altLogDir, { recursive: true });
      }
      
      // Update the log directory to the alternative
      console.log(`Using alternative logs directory: ${altLogDir}`);
      logDir = altLogDir;
    }
    
    // Full path to the log file
    const logPath = path.join(logDir, filename);
    
    console.log(`Writing log file to: ${logPath}`);
    
    // Write the data to the file
    fs.writeFileSync(logPath, JSON.stringify(data, null, 2));
    
    console.log(`Successfully wrote log file: ${logPath}`);
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: `Debug data saved to ${logPath}`,
      filename: filename,
      path: logPath
    });
  } catch (error) {
    console.error('Error saving debug log:', error);
    
    // Return error response with detailed information
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 