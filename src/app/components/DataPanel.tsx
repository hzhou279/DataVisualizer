import React, { useState, useEffect } from 'react';
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
  const itemsPerPage = 15;

  useEffect(() => {
    if (graph) {
      setEditingData(JSON.parse(JSON.stringify(graph.data)));
      setCurrentPage(1);
      setSearchTerm('');
    }
  }, [graph]);

  if (!graph) {
    return null;
  }

  const handlePointChange = (index: number, key: 'x' | 'y', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const newData = [...editingData];
      newData[index] = { ...newData[index], [key]: numValue };
      setEditingData(newData);
    }
  };

  const handleAddPoint = () => {
    const newData = [...editingData, { x: 0, y: 0 }];
    setEditingData(newData);
    // Move to the last page
    setCurrentPage(Math.ceil(newData.length / itemsPerPage));
  };

  const handleDeletePoint = (index: number) => {
    const newData = [...editingData];
    newData.splice(index, 1);
    setEditingData(newData);
    
    // If the current page is now empty, go to the previous page
    const totalPages = Math.ceil(newData.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  };

  const handleSaveChanges = () => {
    onDataUpdate(graph.id, editingData);
  };

  // Filter data by search term
  const filteredData = searchTerm
    ? editingData.filter(
        point => 
          point.x.toString().includes(searchTerm) || 
          point.y.toString().includes(searchTerm)
      )
    : editingData;

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-blue-50">
        <h3 className="font-semibold text-gray-800">Edit Data</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="p-4 border-b border-gray-200 bg-white">
        <h4 className="font-medium text-sm mb-2">{graph.title || graph.filename || 'Graph Data'}</h4>
        <div className="flex items-center">
          <input
            type="text"
            placeholder="Search points..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 p-2 border border-gray-300 rounded-md text-sm mr-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
          />
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {filteredData.length} points
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <table className="min-w-full border-collapse">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              <th className="py-2 px-3 border-b border-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">#</th>
              <th className="py-2 px-3 border-b border-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">X</th>
              <th className="py-2 px-3 border-b border-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Y</th>
              <th className="py-2 px-3 border-b border-gray-200 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((point, index) => {
              const actualIndex = (currentPage - 1) * itemsPerPage + index;
              return (
                <tr key={actualIndex} className="hover:bg-indigo-50 transition-colors">
                  <td className="py-2 px-3 border-b border-gray-200 text-sm text-gray-500">{actualIndex + 1}</td>
                  <td className="py-2 px-3 border-b border-gray-200">
                    <input
                      type="number"
                      value={point.x}
                      onChange={(e) => handlePointChange(actualIndex, 'x', e.target.value)}
                      className="w-full p-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
                      step="0.01"
                    />
                  </td>
                  <td className="py-2 px-3 border-b border-gray-200">
                    <input
                      type="number"
                      value={point.y}
                      onChange={(e) => handlePointChange(actualIndex, 'y', e.target.value)}
                      className="w-full p-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
                      step="0.01"
                    />
                  </td>
                  <td className="py-2 px-3 border-b border-gray-200 text-right">
                    <button
                      onClick={() => handleDeletePoint(actualIndex)}
                      className="text-red-500 hover:text-red-700 text-xs hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-sm text-gray-500">
                  {searchTerm ? "No matching points found" : "No data points available"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 0 && (
        <div className="p-3 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex space-x-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={`px-2 py-1 text-xs rounded ${currentPage === 1 ? 'text-gray-400' : 'text-blue-500 hover:bg-blue-50'}`}
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-2 py-1 text-xs rounded ${currentPage === 1 ? 'text-gray-400' : 'text-blue-500 hover:bg-blue-50'}`}
            >
              Previous
            </button>
            <div className="px-2 py-1 text-xs">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-2 py-1 text-xs rounded ${currentPage === totalPages ? 'text-gray-400' : 'text-blue-500 hover:bg-blue-50'}`}
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className={`px-2 py-1 text-xs rounded ${currentPage === totalPages ? 'text-gray-400' : 'text-blue-500 hover:bg-blue-50'}`}
            >
              Last
            </button>
          </div>
          <button
            onClick={handleAddPoint}
            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
          >
            Add Point
          </button>
        </div>
      )}
      
      <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
        <button 
          onClick={handleSaveChanges}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors shadow-sm"
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
} 