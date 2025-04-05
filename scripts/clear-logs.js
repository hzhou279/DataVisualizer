/**
 * Script to clear the logs directory on application startup
 */
const fs = require('fs');
const path = require('path');

const logsDir = path.join(process.cwd(), 'logs');

// Check if the logs directory exists
if (fs.existsSync(logsDir)) {
  console.log('Clearing logs directory...');
  
  try {
    // Read all files in the directory
    const files = fs.readdirSync(logsDir);
    
    // Delete each file
    for (const file of files) {
      const filePath = path.join(logsDir, file);
      
      // Check if it's a file (not a directory)
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
        console.log(`Deleted log file: ${file}`);
      }
    }
    
    console.log('Logs directory cleared successfully.');
  } catch (error) {
    console.error('Error clearing logs directory:', error);
  }
} else {
  console.log('Logs directory does not exist. Creating it...');
  
  try {
    // Create the logs directory
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('Logs directory created successfully.');
  } catch (error) {
    console.error('Error creating logs directory:', error);
  }
} 