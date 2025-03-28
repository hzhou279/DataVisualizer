import React, { useState, useEffect, useMemo } from 'react';
import { Graph } from '../page';

interface SettingsPanelProps {
  graph: Graph;
  onClose: () => void;
  onSettingsUpdate: (updatedProps: Partial<Graph>) => void;
}

// Helper function to format numbers with appropriate precision
const formatNumber = (num: number): string => {
  // For integers, return as is
  if (Number.isInteger(num)) {
    return num.toString();
  }
  
  // For floats with many decimal places, use a reasonable precision
  // that preserves significant digits without showing too many decimals
  const absNum = Math.abs(num);
  
  if (absNum >= 1000) {
    // Large numbers get fewer decimal places
    return num.toPrecision(6);
  } else if (absNum >= 1) {
    // Medium sized numbers get standard precision
    return num.toPrecision(8);
  } else if (absNum >= 0.0001) {
    // Small numbers get more precision
    return num.toPrecision(8);
  } else {
    // Very small numbers get scientific notation
    return num.toExponential(6);
  }
};

export default function SettingsPanel({ graph, onClose, onSettingsUpdate }: SettingsPanelProps) {
  // Calculate actual data ranges from graph data using memoization
  const dataRanges = useMemo(() => {
    if (!graph.data || graph.data.length === 0) return { xMin: 0, xMax: 0, yMin: 0, yMax: 0 };
    
    // For very large datasets, sample the data for range calculation
    let dataToProcess = graph.data;
    if (graph.data.length > 500) {
      // Sample approximately 500 points for range calculation
      const samplingRate = Math.ceil(graph.data.length / 500);
      dataToProcess = [];
      for (let i = 0; i < graph.data.length; i += samplingRate) {
        dataToProcess.push(graph.data[i]);
      }
      
      // Ensure we include min/max points
      let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
      let xMinPoint, xMaxPoint, yMinPoint, yMaxPoint;
      
      graph.data.forEach(point => {
        if (point.x < xMin) {
          xMin = point.x;
          xMinPoint = point;
        }
        if (point.x > xMax) {
          xMax = point.x;
          xMaxPoint = point;
        }
        if (point.y < yMin) {
          yMin = point.y;
          yMinPoint = point;
        }
        if (point.y > yMax) {
          yMax = point.y;
          yMaxPoint = point;
        }
      });
      
      // Add extremes to the sampled data if not already included
      if (xMinPoint && !dataToProcess.includes(xMinPoint)) dataToProcess.push(xMinPoint);
      if (xMaxPoint && !dataToProcess.includes(xMaxPoint)) dataToProcess.push(xMaxPoint);
      if (yMinPoint && !dataToProcess.includes(yMinPoint)) dataToProcess.push(yMinPoint);
      if (yMaxPoint && !dataToProcess.includes(yMaxPoint)) dataToProcess.push(yMaxPoint);
    }
    
    const xValues = dataToProcess.map(point => point.x);
    const yValues = dataToProcess.map(point => point.y);
    
    return {
      xMin: Math.min(...xValues),
      xMax: Math.max(...xValues),
      yMin: Math.min(...yValues),
      yMax: Math.max(...yValues)
    };
  }, [graph.data]);
  
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
    showGrid: graph.settings?.showGrid !== undefined ? graph.settings.showGrid : true,
    dotSize: graph.settings?.dotSize !== undefined ? graph.settings.dotSize : 5,
    showLabels: graph.settings?.showLabels !== undefined ? graph.settings.showLabels : true,
    globalX: graph.globalCoordinate?.x?.toString() || '0',
    globalY: graph.globalCoordinate?.y?.toString() || '0',
    rotationCenterX: graph.rotationCenter?.x?.toString() || '0',
    rotationCenterY: graph.rotationCenter?.y?.toString() || '0',
  });

  // Update local state when graph props change
  useEffect(() => {
    setLocalState({
      width: graph.size.width,
      height: graph.size.height,
      rotation: graph.rotation,
      color: graph.color,
      // Preserve full precision of domain values
      xMin: graph.domains?.xMin !== undefined ? String(graph.domains.xMin) : '',
      xMax: graph.domains?.xMax !== undefined ? String(graph.domains.xMax) : '',
      yMin: graph.domains?.yMin !== undefined ? String(graph.domains.yMin) : '',
      yMax: graph.domains?.yMax !== undefined ? String(graph.domains.yMax) : '',
      xIntervals: graph.axisIntervals?.x?.toString() || '5',
      yIntervals: graph.axisIntervals?.y?.toString() || '5',
      quadrantMode: graph.quadrantMode || 'first',
      showGrid: graph.settings?.showGrid !== undefined ? graph.settings.showGrid : true,
      dotSize: graph.settings?.dotSize !== undefined ? graph.settings.dotSize : 5,
      showLabels: graph.settings?.showLabels !== undefined ? graph.settings.showLabels : true,
      globalX: graph.globalCoordinate?.x?.toString() || '0',
      globalY: graph.globalCoordinate?.y?.toString() || '0',
      rotationCenterX: graph.rotationCenter?.x?.toString() || '0',
      rotationCenterY: graph.rotationCenter?.y?.toString() || '0',
    });
  }, [graph]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setLocalState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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

  // Reset domains to automatic calculation
  const handleResetDomains = () => {
    setLocalState(prev => ({
      ...prev,
      xMin: '',
      xMax: '',
      yMin: '',
      yMax: ''
    }));
  };

  // Handle apply changes
  const handleApply = () => {
    const domains: any = {};
    
    // Only include defined values for axis ranges - preserve exact values
    if (localState.xMin !== '') {
      // Use parseFloat directly to keep full precision
      domains.xMin = parseFloat(localState.xMin);
    }
    
    if (localState.xMax !== '') {
      domains.xMax = parseFloat(localState.xMax);
    }
    
    if (localState.yMin !== '') {
      domains.yMin = parseFloat(localState.yMin);
    }
    
    if (localState.yMax !== '') {
      domains.yMax = parseFloat(localState.yMax);
    }
    
    // Ensure we have valid interval values
    const axisIntervals = {
      x: Math.max(1, parseInt(localState.xIntervals) || 5),
      y: Math.max(1, parseInt(localState.yIntervals) || 5)
    };
    
    // Parse global coordinate and rotation center - preserve exact values
    const globalCoordinate = {
      x: parseFloat(localState.globalX) || 0,
      y: parseFloat(localState.globalY) || 0
    };
    
    const rotationCenter = {
      x: parseFloat(localState.rotationCenterX) || 0,
      y: parseFloat(localState.rotationCenterY) || 0
    };
    
    onSettingsUpdate({
      size: { 
        width: parseFloat(localState.width.toString()) || graph.size.width, 
        height: parseFloat(localState.height.toString()) || graph.size.height 
      },
      rotation: parseFloat(localState.rotation.toString()) || 0,
      color: localState.color,
      domains: Object.keys(domains).length > 0 ? domains : undefined,
      axisIntervals,
      quadrantMode: localState.quadrantMode as 'first' | 'all',
      settings: {
        showGrid: localState.showGrid,
        dotSize: parseInt(localState.dotSize.toString()) || 5,
        showLabels: localState.showLabels
      },
      globalCoordinate,
      rotationCenter
    });
    
    // Automatically close the panel after applying changes
    onClose();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-indigo-100">
        <h3 className="font-semibold text-indigo-900">{graph.title || 'Graph Settings'}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Graph Size Settings */}
        <div>
          <h4 className="font-medium text-sm mb-2 text-indigo-900">Graph Size</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="width" className="block text-xs text-gray-500 mb-1">Width</label>
              <input
                type="number"
                id="width"
                name="width"
                value={localState.width}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
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
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                min="200"
              />
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div>
          <h4 className="font-medium text-sm mb-2 text-indigo-900">Appearance</h4>
          <div className="space-y-2">
            <div>
              <label htmlFor="color" className="block text-xs text-gray-500 mb-1">Graph Color</label>
              <input
                type="color"
                id="color"
                name="color"
                value={localState.color}
                onChange={handleColorChange}
                className="w-full h-8 p-0 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label htmlFor="dotSize" className="block text-xs text-gray-500 mb-1">Dot Size</label>
              <input
                type="range"
                id="dotSize"
                name="dotSize"
                value={localState.dotSize}
                onChange={handleInputChange}
                className="w-full"
                min="2"
                max="10"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Small</span>
                <span>Large</span>
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showGrid"
                name="showGrid"
                checked={localState.showGrid}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="showGrid" className="ml-2 block text-sm text-gray-700">
                Show Grid Lines
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showLabels"
                name="showLabels"
                checked={localState.showLabels}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="showLabels" className="ml-2 block text-sm text-gray-700">
                Show Axis Labels
              </label>
            </div>
          </div>
        </div>

        {/* Quadrant Mode */}
        <div>
          <h4 className="font-medium text-sm mb-2 text-indigo-900">Quadrant Mode</h4>
          <select
            id="quadrantMode"
            name="quadrantMode"
            value={localState.quadrantMode}
            onChange={handleSelectChange}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
          >
            <option value="first">First Quadrant Only</option>
            <option value="all">All Four Quadrants</option>
          </select>
        </div>

        {/* Data Range Information */}
        <div className="p-3 bg-indigo-50 rounded border border-indigo-200 text-sm">
          <h4 className="font-medium text-sm mb-2 text-indigo-900">Data Range</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-600">X: [{formatNumber(dataRanges.xMin)}, {formatNumber(dataRanges.xMax)}]</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Y: [{formatNumber(dataRanges.yMin)}, {formatNumber(dataRanges.yMax)}]</p>
            </div>
          </div>
        </div>

        {/* X-Axis Range */}
        <div>
          <h4 className="font-medium text-sm mb-2 text-indigo-900">X-Axis Range</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="xMin" className="block text-xs text-gray-500 mb-1">Min</label>
              <input
                type="number"
                id="xMin"
                name="xMin"
                value={localState.xMin}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                placeholder={`Auto (${formatNumber(dataRanges.xMin)})`}
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
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                placeholder={`Auto (${formatNumber(dataRanges.xMax)})`}
              />
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="flex-1 mr-2">
              <label htmlFor="xIntervals" className="block text-xs text-gray-500 mb-1">Intervals</label>
              <input
                type="number"
                id="xIntervals"
                name="xIntervals"
                value={localState.xIntervals}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                min="2"
                max="20"
              />
            </div>
            <button 
              onClick={handleResetDomains}
              className="mt-4 px-2 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300 whitespace-nowrap"
              title="Reset to automatic domain calculation"
            >
              Reset Ranges
            </button>
          </div>
        </div>

        {/* Y-Axis Range */}
        <div>
          <h4 className="font-medium text-sm mb-2 text-indigo-900">Y-Axis Range</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="yMin" className="block text-xs text-gray-500 mb-1">Min</label>
              <input
                type="number"
                id="yMin"
                name="yMin"
                value={localState.yMin}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                placeholder={`Auto (${formatNumber(dataRanges.yMin)})`}
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
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                placeholder={`Auto (${formatNumber(dataRanges.yMax)})`}
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
              className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
              min="2"
              max="20"
            />
          </div>
        </div>

        {/* Graph Transformation Settings */}
        <div>
          <h4 className="font-medium text-sm mb-2 text-indigo-900">Graph Transformation</h4>
          <div className="space-y-2">
            <div>
              <label htmlFor="rotation" className="block text-xs text-gray-500 mb-1">Rotation (degrees)</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  id="rotation"
                  name="rotation"
                  value={localState.rotation}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
                <button 
                  onClick={handleResetRotation}
                  className="px-2 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Global Coordinate */}
            <div className="pt-2">
              <label className="block text-xs text-gray-500 mb-1">Global Coordinate</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="globalX" className="block text-xs text-gray-500 mb-1">X</label>
                  <input
                    type="number"
                    id="globalX"
                    name="globalX"
                    value={localState.globalX}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="globalY" className="block text-xs text-gray-500 mb-1">Y</label>
                  <input
                    type="number"
                    id="globalY"
                    name="globalY"
                    value={localState.globalY}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Rotation Center */}
            <div className="pt-2">
              <label className="block text-xs text-gray-500 mb-1">Rotation Center</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="rotationCenterX" className="block text-xs text-gray-500 mb-1">X</label>
                  <input
                    type="number"
                    id="rotationCenterX"
                    name="rotationCenterX"
                    value={localState.rotationCenterX}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="rotationCenterY" className="block text-xs text-gray-500 mb-1">Y</label>
                  <input
                    type="number"
                    id="rotationCenterY"
                    name="rotationCenterY"
                    value={localState.rotationCenterY}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-gray-200">
        <button 
          onClick={handleApply} 
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm transition-colors"
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
} 