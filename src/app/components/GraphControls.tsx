'use client';

import { useState } from 'react';

interface GraphControlsProps {
  filename?: string;
  onPositionUpdate: (x: number, y: number) => void;
}

export default function GraphControls({ filename, onPositionUpdate }: GraphControlsProps) {
  const [deltaX, setDeltaX] = useState('0');
  const [deltaY, setDeltaY] = useState('0');

  const handleUpdate = () => {
    const x = parseFloat(deltaX) || 0;
    const y = parseFloat(deltaY) || 0;
    onPositionUpdate(x, y);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 truncate" title={filename || 'Graph'}>
          {filename || 'Graph'}
        </h3>
      </div>

      <div className="p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                X Position
              </label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="number"
                  value={deltaX}
                  onChange={(e) => setDeltaX(e.target.value)}
                  className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Y Position
              </label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="number"
                  value={deltaY}
                  onChange={(e) => setDeltaY(e.target.value)}
                  className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleUpdate}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Update Position
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 