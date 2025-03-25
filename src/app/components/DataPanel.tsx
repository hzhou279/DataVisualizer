import React, { useState, useEffect, useMemo } from 'react';
import { Graph } from '../page';
import { ParsedData } from '../utils/csvParser';

interface DataPanelProps {
  graph: Graph | null;
  onDataUpdate: (graphId: string, updatedData: ParsedData[]) => void;
  onClose: () => void;
}

export default function DataPanel({ graph, onDataUpdate, onClose }: DataPanelProps) {
  const [editingData, setEditingData] = useState<ParsedData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [maxPages, setMaxPages] = useState(1);
  
  // Add virtualization state
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  
  // Initialize editing data when graph changes
  useEffect(() => {
    if (graph && graph.data) {
      setEditingData([...graph.data]);
      setCurrentPage(1); // Reset to first page when graph changes
    }
  }, [graph]);
  
  // Handle point change
  const handlePointChange = (index: number, field: 'x' | 'y', value: string) => {
    const newValue = parseFloat(value);
    if (isNaN(newValue)) return;
    
    const newData = [...editingData];
    newData[index] = { ...newData[index], [field]: newValue };
    setEditingData(newData);
  };
  
  // Add a new point
  const handleAddPoint = () => {
    // Add a new point with default values or average values from existing data
    let newX = 0;
    let newY = 0;
    
    if (editingData.length > 0) {
      // Use average of existing points 
      const sumX = editingData.reduce((acc, point) => acc + point.x, 0);
      const sumY = editingData.reduce((acc, point) => acc + point.y, 0);
      newX = Math.round((sumX / editingData.length) * 100) / 100;
      newY = Math.round((sumY / editingData.length) * 100) / 100;
    }
    
    const newData = [...editingData, { x: newX, y: newY }];
    setEditingData(newData);
    // Go to last page to show the new point
    setCurrentPage(Math.ceil(newData.length / itemsPerPage));
  };
  
  // Delete point
  const handleDeletePoint = (index: number) => {
    const newData = editingData.filter((_, i) => i !== index);
    setEditingData(newData);
    
    // Adjust current page if necessary
    const newMaxPage = Math.max(1, Math.ceil(newData.length / itemsPerPage));
    if (currentPage > newMaxPage) {
      setCurrentPage(newMaxPage);
    }
  };
  
  // Save changes
  const handleSaveChanges = () => {
    if (!graph) return;
    onDataUpdate(graph.id, editingData);
    onClose();
  };
  
  // Filter data by search term and apply pagination
  const filteredAndPaginatedData = useMemo(() => {
    let filtered = editingData;
    
    // Apply search filter if there's a search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = editingData.filter(point => 
        point.x.toString().includes(term) || 
        point.y.toString().includes(term)
      );
    }
    
    // Calculate max pages
    const newMaxPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    setMaxPages(newMaxPages);
    
    // Adjust current page if out of bounds
    if (currentPage > newMaxPages) {
      setCurrentPage(newMaxPages);
    }
    
    // Calculate indexes for current page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filtered.length);
    
    // Set the visible range for virtualization
    setVisibleRange({ start: startIndex, end: endIndex });
    
    return {
      allFiltered: filtered,
      visibleData: filtered.slice(startIndex, endIndex),
      totalCount: filtered.length
    };
  }, [editingData, searchTerm, currentPage, itemsPerPage]);
  
  // Calculate virtualized table height
  const getTableContainerHeight = useMemo(() => {
    // Calculate based on data size to ensure scrollbar appears
    const rowHeight = 40; // approximate height of each row
    return Math.min(
      // Display at most 10 rows at a time for performance
      Math.min(10, filteredAndPaginatedData.visibleData.length) * rowHeight,
      // Ensure table isn't too small
      Math.max(200, Math.min(400, window.innerHeight - 250))
    );
  }, [filteredAndPaginatedData.visibleData.length]);
  
  if (!graph) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-white to-indigo-100">
        <h3 className="font-semibold text-indigo-900">{graph.title || 'Data Panel'}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="w-full">
          <input
            type="text"
            placeholder="Search points..."
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
          />
        </div>
        
        {/* Dynamic row count selector for large datasets */}
        {editingData.length > 50 && (
          <div className="flex justify-end text-sm text-gray-600">
            <label htmlFor="itemsPerPage" className="mr-2 flex items-center">Rows per page:</label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={(e) => {
                const newValue = parseInt(e.target.value);
                setItemsPerPage(newValue);
                setCurrentPage(1); // Reset to first page when changing items per page
              }}
              className="p-1 border border-gray-300 rounded"
            >
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
        )}
        
        <div className="w-full overflow-x-auto">
          <div style={{height: getTableContainerHeight}} className="overflow-y-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">#</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">X</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Y</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndPaginatedData.visibleData.length > 0 ? (
                  filteredAndPaginatedData.visibleData.map((point, index) => {
                    const actualIndex = visibleRange.start + index;
                    return (
                      <tr key={actualIndex} className="hover:bg-blue-50">
                        <td className="border px-4 py-2 text-sm">{actualIndex + 1}</td>
                        <td className="border px-4 py-2">
                          <input
                            type="number"
                            value={point.x}
                            onChange={(e) => handlePointChange(actualIndex, 'x', e.target.value)}
                            className="w-full p-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                            step="0.01"
                          />
                        </td>
                        <td className="border px-4 py-2">
                          <input
                            type="number"
                            value={point.y}
                            onChange={(e) => handlePointChange(actualIndex, 'y', e.target.value)}
                            className="w-full p-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                            step="0.01"
                          />
                        </td>
                        <td className="border px-4 py-2">
                          <button
                            onClick={() => handleDeletePoint(actualIndex)}
                            className="text-red-500 hover:text-red-700 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="border px-4 py-8 text-center text-gray-500">
                      {editingData.length === 0 
                        ? "No data points available." 
                        : "No matching data points found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Pagination controls */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {filteredAndPaginatedData.visibleData.length > 0 ? visibleRange.start + 1 : 0} to {visibleRange.end} of {filteredAndPaginatedData.totalCount} points
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
            >
              Prev
            </button>
            <span className="px-3 py-1 bg-white border border-gray-300 rounded">
              {currentPage} / {maxPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(maxPages, p + 1))}
              disabled={currentPage >= maxPages}
              className={`px-3 py-1 rounded ${currentPage >= maxPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
            >
              Next
            </button>
          </div>
        </div>
        
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <button
            onClick={handleAddPoint}
            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
          >
            Add Point
          </button>
          <button
            onClick={handleSaveChanges}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
} 