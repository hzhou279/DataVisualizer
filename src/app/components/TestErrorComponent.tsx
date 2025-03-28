'use client';

import { useEffect, useState } from 'react';

// Component that throws an error when a button is clicked
export default function TestErrorComponent() {
  const [shouldError, setShouldError] = useState(false);

  useEffect(() => {
    if (shouldError) {
      throw new Error('This is a test error from TestErrorComponent');
    }
  }, [shouldError]);

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
      <h3 className="font-medium mb-2">Error Boundary Test</h3>
      <p className="text-sm mb-2">Click the button below to trigger an error and test the ErrorBoundary.</p>
      <button
        onClick={() => setShouldError(true)}
        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Trigger Error
      </button>
    </div>
  );
} 