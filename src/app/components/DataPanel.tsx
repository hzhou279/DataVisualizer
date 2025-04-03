import React, { useState, useEffect, useMemo } from 'react';
import { Graph } from '../page';
import { ParsedData } from '../utils/csvParser';

interface DataPanelProps {
  graph: {
    id: string;
    title: string;
    data: any[];
    color: string;
  };
  onDataUpdate: (graphId: string, data: any[]) => void;
  onClose: () => void;
}

export default function DataPanel({ graph, onDataUpdate, onClose }: DataPanelProps) {
  const [editingData, setEditingData] = useState<ParsedData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [maxPages, setMaxPages] = useState(1);
  
  // Add virtualization state
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  
  // Add new state for filtering dumped points
  const [filterMode, setFilterMode] = useState<'all' | 'original' | 'dumped'>('all');
  
  // Add stats for dumped points
  const dumpedPointsStats = useMemo(() => {
    const dumpedPoints = graph.data.filter(point => point._sourceId);
    
    // Count points by source
    const sourceCount: Record<string, number> = {};
    dumpedPoints.forEach(point => {
      const source = point._source || 'Unknown';
      sourceCount[source] = (sourceCount[source] || 0) + 1;
    });
    
    return {
      total: dumpedPoints.length,
      sourceCount
    };
  }, [graph.data]);
  
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
    
    // Apply filter mode
    if (filterMode === 'original') {
      filtered = filtered.filter(point => !point._sourceId);
    } else if (filterMode === 'dumped') {
      filtered = filtered.filter(point => !!point._sourceId);
    }
    
    // Apply search term
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(point => {
        // Search in all fields
        return Object.entries(point).some(([key, value]) => {
          if (typeof value === 'string') {
            return value.toLowerCase().includes(lowerSearchTerm);
          } else if (typeof value === 'number') {
            return value.toString().includes(lowerSearchTerm);
          }
          return false;
        });
      });
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
  }, [editingData, searchTerm, currentPage, itemsPerPage, filterMode]);
  
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
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="border-b border-gray-200 px-4 py-3 flex justify-between items-center bg-indigo-50">
        <h2 className="text-lg font-medium text-indigo-800 truncate">
          Data: {graph.title}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close panel"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="p-4 bg-white border-b">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium text-gray-700">Total points: {graph.data.length}</div>
            <div className="text-xs text-gray-500">
              {dumpedPointsStats.total > 0 ? (
                <span>
                  {dumpedPointsStats.total} points ({((dumpedPointsStats.total / graph.data.length) * 100).toFixed(1)}%) dumped from other graphs
                </span>
              ) : null}
            </div>
          </div>
          
          {/* Sources breakdown */}
          {dumpedPointsStats.total > 0 && (
            <div className="mb-2 text-xs text-gray-600">
              <details className="mt-1">
                <summary className="cursor-pointer">Show sources</summary>
                <div className="pl-2 mt-1">
                  {Object.entries(dumpedPointsStats.sourceCount).map(([source, count]) => (
                    <div key={source} className="flex justify-between">
                      <span>{source}:</span>
                      <span>{count} points</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
          
          {/* Filter controls */}
          <div className="flex items-center gap-2 mb-2">
            <div className="text-sm font-medium text-gray-700">Filter:</div>
            <div className="flex gap-1">
              <button
                className={`px-2 py-1 text-xs rounded-md ${filterMode === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setFilterMode('all')}
              >
                All
              </button>
              <button
                className={`px-2 py-1 text-xs rounded-md ${filterMode === 'original' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setFilterMode('original')}
              >
                Original
              </button>
              <button
                className={`px-2 py-1 text-xs rounded-md ${filterMode === 'dumped' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setFilterMode('dumped')}
                disabled={dumpedPointsStats.total === 0}
              >
                Dumped
              </button>
            </div>
          </div>
          
          {/* Search input */}
          <div className="relative mt-1">
            <input
              type="text"
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-1.5 px-3 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Results count */}
        <div className="text-xs text-gray-500 mb-2">
          Showing {filteredAndPaginatedData.visibleData.length} of {filteredAndPaginatedData.totalCount} points
        </div>
      </div>
      
      {/* Data table */}
      <div className="overflow-auto flex-1">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                X
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Y
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              {/* Additional columns for metadata like source graph */}
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndPaginatedData.visibleData.map((point, index) => {
              const actualIndex = visibleRange.start + index;
              const isDumped = !!point._sourceId;
              
              return (
                <tr 
                  key={actualIndex} 
                  className={isDumped ? 'bg-purple-50' : 'hover:bg-gray-50'}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                    {actualIndex + 1}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {typeof point.x === 'number' ? point.x.toFixed(4) : point.x}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {typeof point.y === 'number' ? point.y.toFixed(4) : point.y}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {isDumped ? (
                      <span className="text-purple-600 text-xs">
                        {point._source || 'Dumped'}
                      </span>
                    ) : (
                      <span className="text-green-600 text-xs">Original</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {/* Actions for individual points */}
                    <div className="flex space-x-1">
                      {isDumped && point._originalX !== undefined && (
                        <span title={`Original: (${point._originalX.toFixed(2)}, ${point._originalY.toFixed(2)})`} className="text-xs text-blue-500 cursor-help">
                          <svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {filteredAndPaginatedData.visibleData.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-500">
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination controls */}
      <div className="border-t border-gray-200 px-4 py-2 flex items-center justify-between bg-gray-50">
        <div className="flex items-center text-xs text-gray-500">
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border-gray-300 rounded-md mr-2 text-xs"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>per page</span>
        </div>
        
        <div className="flex space-x-1">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 text-xs bg-white border border-gray-300 rounded-md disabled:opacity-50"
          >
            Previous
          </button>
          <div className="px-2 py-1 text-xs">
            Page {currentPage} of {maxPages}
          </div>
          <button
            onClick={() => setCurrentPage(Math.min(maxPages, currentPage + 1))}
            disabled={currentPage >= maxPages}
            className="px-2 py-1 text-xs bg-white border border-gray-300 rounded-md disabled:opacity-50"
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
  );
} 