import React, { useState, useEffect } from 'react';
import { Graph } from '../page';

interface GraphSettingsPanelProps {
  graph: Graph;
  onClose: () => void;
  onUpdate: (updatedProps: Partial<Graph>) => void;
}

export default function GraphSettingsPanel({ graph, onClose, onUpdate }: GraphSettingsPanelProps) {
  // Calculate actual data ranges from graph data
  const calculateDataRanges = () => {
    if (graph.data.length === 0) return { xMin: 0, xMax: 0, yMin: 0, yMax: 0 };
    
    const xValues = graph.data.map(point => point.x);
    const yValues = graph.data.map(point => point.y);
    
    return {
      xMin: Math.min(...xValues),
      xMax: Math.max(...xValues),
      yMin: Math.min(...yValues),
      yMax: Math.max(...yValues)
    };
  };
  
  const dataRanges = calculateDataRanges();
  
  const [localState, setLocalState] = useState({
    width: graph.size.width,
    height: graph.size.height,
    rotation: graph.rotation,
    color: graph.color,
    xMin: graph.domains?.xMin !== undefined ? graph.domains.xMin.toString() : '',
    xMax: graph.domains?.xMax !== undefined ? graph.domains.xMax.toString() : '',
    yMin: graph.domains?.yMin !== undefined ? graph.domains.yMin.toString() : '',
    yMax: graph.domains?.yMax !== undefined ? graph.domains.yMax.toString() : '',
    xIntervals: graph.axisIntervals?.x?.toString() || '5',
    yIntervals: graph.axisIntervals?.y?.toString() || '5',
    quadrantMode: graph.quadrantMode || 'first',
  });

  // Update local state when graph props change
  useEffect(() => {
    setLocalState({
      width: graph.size.width,
      height: graph.size.height,
      rotation: graph.rotation,
      color: graph.color,
      xMin: graph.domains?.xMin !== undefined ? graph.domains.xMin.toString() : '',
      xMax: graph.domains?.xMax !== undefined ? graph.domains.xMax.toString() : '',
      yMin: graph.domains?.yMin !== undefined ? graph.domains.yMin.toString() : '',
      yMax: graph.domains?.yMax !== undefined ? graph.domains.yMax.toString() : '',
      xIntervals: graph.axisIntervals?.x?.toString() || '5',
      yIntervals: graph.axisIntervals?.y?.toString() || '5',
      quadrantMode: graph.quadrantMode || 'first',
    });
  }, [graph]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle select changes
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle color change
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalState(prev => ({
      ...prev,
      color: e.target.value
    }));
  };

  // Reset rotation to 0
  const handleResetRotation = () => {
    setLocalState(prev => ({
      ...prev,
      rotation: 0
    }));
  };

  // Handle apply changes
  const handleApply = () => {
    const domains: any = {};
    
    // Only include defined values for axis ranges
    if (localState.xMin !== '') domains.xMin = parseFloat(localState.xMin);
    if (localState.xMax !== '') domains.xMax = parseFloat(localState.xMax);
    if (localState.yMin !== '') domains.yMin = parseFloat(localState.yMin);
    if (localState.yMax !== '') domains.yMax = parseFloat(localState.yMax);
    
    const axisIntervals = {
      x: parseInt(localState.xIntervals) || 5,
      y: parseInt(localState.yIntervals) || 5
    };
    
    onUpdate({
      size: { 
        width: parseFloat(localState.width.toString()) || graph.size.width, 
        height: parseFloat(localState.height.toString()) || graph.size.height 
      },
      rotation: parseFloat(localState.rotation.toString()) || 0,
      color: localState.color,
      domains: Object.keys(domains).length > 0 ? domains : undefined,
      axisIntervals,
      quadrantMode: localState.quadrantMode
    });
    
    // Automatically close the panel after applying changes
    onClose();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold">{graph.title || graph.filename || 'Graph Settings'}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ×
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Graph Size Settings */}
        <div>
          <h4 className="font-medium text-sm mb-2">Graph Size</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="width" className="block text-xs text-gray-500 mb-1">Width</label>
              <input
                type="number"
                id="width"
                name="width"
                value={localState.width}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded text-sm"
                min="250"
              />
            </div>
            <div>
              <label htmlFor="height" className="block text-xs text-gray-500 mb-1">Height</label>
              <input
                type="number"
                id="height"
                name="height"
                value={localState.height}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded text-sm"
                min="200"
              />
            </div>
          </div>
        </div>

        {/* Quadrant Mode */}
        <div>
          <h4 className="font-medium text-sm mb-2">Quadrant Mode</h4>
          <select
            id="quadrantMode"
            name="quadrantMode"
            value={localState.quadrantMode}
            onChange={handleSelectChange}
            className="w-full p-2 border border-gray-300 rounded text-sm"
          >
            <option value="first">First Quadrant Only</option>
            <option value="all">All Four Quadrants</option>
          </select>
        </div>

        {/* Data Range Information */}
        <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm">
          <h4 className="font-medium text-sm mb-2">Data Range</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500">X: [{dataRanges.xMin.toFixed(2)}, {dataRanges.xMax.toFixed(2)}]</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Y: [{dataRanges.yMin.toFixed(2)}, {dataRanges.yMax.toFixed(2)}]</p>
            </div>
          </div>
        </div>

        {/* X-Axis Range */}
        <div>
          <h4 className="font-medium text-sm mb-2">X-Axis Range</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="xMin" className="block text-xs text-gray-500 mb-1">Min</label>
              <input
                type="number"
                id="xMin"
                name="xMin"
                value={localState.xMin}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded text-sm"
                placeholder={graph.domains?.xMin !== undefined ? graph.domains.xMin.toString() : "Auto"}
              />
            </div>
            <div>
              <label htmlFor="xMax" className="block text-xs text-gray-500 mb-1">Max</label>
              <input
                type="number"
                id="xMax"
                name="xMax"
                value={localState.xMax}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded text-sm"
                placeholder={graph.domains?.xMax !== undefined ? graph.domains.xMax.toString() : "Auto"}
              />
            </div>
          </div>
          <div className="mt-2">
            <label htmlFor="xIntervals" className="block text-xs text-gray-500 mb-1">Intervals</label>
            <input
              type="number"
              id="xIntervals"
              name="xIntervals"
              value={localState.xIntervals}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              min="2"
              max="20"
            />
          </div>
        </div>

        {/* Y-Axis Range */}
        <div>
          <h4 className="font-medium text-sm mb-2">Y-Axis Range</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="yMin" className="block text-xs text-gray-500 mb-1">Min</label>
              <input
                type="number"
                id="yMin"
                name="yMin"
                value={localState.yMin}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded text-sm"
                placeholder={graph.domains?.yMin !== undefined ? graph.domains.yMin.toString() : "Auto"}
              />
            </div>
            <div>
              <label htmlFor="yMax" className="block text-xs text-gray-500 mb-1">Max</label>
              <input
                type="number"
                id="yMax"
                name="yMax"
                value={localState.yMax}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded text-sm"
                placeholder={graph.domains?.yMax !== undefined ? graph.domains.yMax.toString() : "Auto"}
              />
            </div>
          </div>
          <div className="mt-2">
            <label htmlFor="yIntervals" className="block text-xs text-gray-500 mb-1">Intervals</label>
            <input
              type="number"
              id="yIntervals"
              name="yIntervals"
              value={localState.yIntervals}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded text-sm"
              min="2"
              max="20"
            />
          </div>
        </div>

        {/* Rotation Setting */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-sm">Rotation</h4>
            <button
              onClick={handleResetRotation}
              className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
            >
              Reset to 0°
            </button>
          </div>
          <input
            type="number"
            id="rotation"
            name="rotation"
            value={localState.rotation}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded text-sm"
            min="0"
            max="360"
            step="0.1"
          />
        </div>

        {/* Point Color */}
        <div>
          <h4 className="font-medium text-sm mb-2">Point Color</h4>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              id="color"
              name="color"
              value={localState.color}
              onChange={handleColorChange}
              className="p-1 border border-gray-300 rounded h-8 w-8"
            />
            <input
              type="text"
              value={localState.color}
              onChange={handleColorChange}
              className="flex-1 p-2 border border-gray-300 rounded text-sm"
              placeholder="#000000"
            />
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-gray-200">
        <button 
          onClick={handleApply}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors shadow-sm"
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
} 