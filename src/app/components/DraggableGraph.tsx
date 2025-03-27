'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import React from 'react';

interface DraggableGraphProps {
  data: any[];
  filename?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  zIndex: number;
  onPositionChange: (x: number, y: number) => void;
  onSizeChange: (width: number, height: number) => void;
  onRotationChange: (rotation: number) => void;
  color: string;
  onColorChange: (color: string) => void;
  onRemove: () => void;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  domains?: {
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
  };
  axisIntervals?: {
    x: number;
    y: number;
  };
  quadrantMode?: 'first' | 'all';
  onDataPanelToggle: () => void;
}

export default function DraggableGraph({ 
  data, 
  filename, 
  position, 
  size,
  rotation,
  zIndex,
  onPositionChange,
  onSizeChange,
  onRotationChange,
  color,
  onColorChange,
  onRemove,
  isSettingsOpen,
  onToggleSettings,
  domains,
  axisIntervals,
  quadrantMode = 'first',
  onDataPanelToggle
}: DraggableGraphProps) {
  // Store local rotation to ensure UI updates immediately
  const [localRotation, setLocalRotation] = useState(rotation);
  const [rotationValue, setRotationValue] = useState("0");
  const [xAxisMin, setXAxisMin] = useState<string>("");
  const [xAxisMax, setXAxisMax] = useState<string>("");
  const [yAxisMin, setYAxisMin] = useState<string>("");
  const [yAxisMax, setYAxisMax] = useState<string>("");
  const [localDomains, setLocalDomains] = useState({
    xMin: domains?.xMin,
    xMax: domains?.xMax,
    yMin: domains?.yMin,
    yMax: domains?.yMax
  });
  const [localColor, setLocalColor] = useState(color);
  const [isMinimized, setIsMinimized] = useState(false);
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const [scaledDomains, setScaledDomains] = useState({
    xMin: domains?.xMin,
    xMax: domains?.xMax,
    yMin: domains?.yMin,
    yMax: domains?.yMax
  });
  
  // Reference to the container element
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Process data for rendering all points efficiently
  const processedData = useMemo(() => {
    // Return all data points regardless of size
    return data;
  }, [data]);

  // Use WebGL for large datasets if available
  const isLargeDataset = useMemo(() => {
    return data && data.length > 1000;
  }, [data]);

  // Optimize rendering based on dataset size
  const renderStrategy = useMemo(() => {
    if (!data) return { useSimplePoints: false, pointSize: 6 };
    
    return {
      // Use simplified points for large datasets
      useSimplePoints: data.length > 500,
      // Adjust point size based on data density
      pointSize: data.length > 5000 ? 2 : 
                data.length > 1000 ? 3 : 
                data.length > 500 ? 4 : 6
    };
  }, [data]);

  // Memoize domain calculations to avoid recalculating on every render
  const calculatedDomains = useMemo(() => {
    if (!data || data.length === 0) return scaledDomains;
    
    // Calculate the data ranges from the full dataset (not the sampled one)
    const xValues = data.map(point => point.x);
    const yValues = data.map(point => point.y);
    
    const dataMin = {
      x: Math.min(...xValues),
      y: Math.min(...yValues)
    };
    
    const dataMax = {
      x: Math.max(...xValues),
      y: Math.max(...yValues)
    };
    
    // Use provided domains or calculate from data
    const domainValues = {
      xMin: localDomains.xMin !== undefined ? localDomains.xMin : (quadrantMode === 'all' ? Math.min(dataMin.x, 0) : 0),
      xMax: localDomains.xMax !== undefined ? localDomains.xMax : dataMax.x,
      yMin: localDomains.yMin !== undefined ? localDomains.yMin : (quadrantMode === 'all' ? Math.min(dataMin.y, 0) : 0),
      yMax: localDomains.yMax !== undefined ? localDomains.yMax : dataMax.y
    };
    
    // Add small padding to ensure points don't sit on the edge
    const xPadding = (domainValues.xMax - domainValues.xMin) * 0.05;
    const yPadding = (domainValues.yMax - domainValues.yMin) * 0.05;
    
    return {
      xMin: domainValues.xMin - xPadding,
      xMax: domainValues.xMax + xPadding,
      yMin: domainValues.yMin - yPadding,
      yMax: domainValues.yMax + yPadding
    };
  }, [data, localDomains, quadrantMode]);

  // Update scaled domains when domains are calculated
  useEffect(() => {
    setScaledDomains(calculatedDomains);
  }, [calculatedDomains]);

  // Handle window resize to adapt graph size
  useEffect(() => {
    // Function to calculate and apply appropriate graph dimensions
    const calculateAndApplyDimensions = () => {
      if (!isMinimized && data && data.length > 0) {
        const minWidth = 400;
        const minHeight = 300;
        const maxWidth = Math.min(800, window.innerWidth * 0.7);
        const maxHeight = Math.min(600, window.innerHeight * 0.7);
        
        // Check if current dimensions need adjustment
        let newWidth = size.width;
        let newHeight = size.height;
        let needsUpdate = false;
        
        // Check width constraints
        if (size.width > maxWidth) {
          newWidth = maxWidth;
          needsUpdate = true;
        } else if (size.width < minWidth) {
          newWidth = minWidth;
          needsUpdate = true;
        }
        
        // Check height constraints
        if (size.height > maxHeight) {
          newHeight = maxHeight;
          needsUpdate = true;
        } else if (size.height < minHeight) {
          newHeight = minHeight;
          needsUpdate = true;
        }
        
        // Only update if dimensions need to change
        if (needsUpdate) {
          onSizeChange(newWidth, newHeight);
        }
      }
    };
    
    // Apply dimensions on mount
    calculateAndApplyDimensions();
    
    // Set up window resize listener
    const handleResize = () => {
      calculateAndApplyDimensions();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMinimized, data, size.width, size.height, onSizeChange]);

  // Sync local rotation with prop when it changes externally
  useEffect(() => {
    setLocalRotation(rotation);
    setRotationValue(rotation.toString());
  }, [rotation]);

  // Sync local color with prop when it changes externally
  useEffect(() => {
    setLocalColor(color);
  }, [color]);

  // Sync domains with props when they change
  useEffect(() => {
    if (domains) {
      setLocalDomains({
        xMin: domains.xMin,
        xMax: domains.xMax,
        yMin: domains.yMin,
        yMax: domains.yMax
      });
      
      if (domains.xMin !== undefined) {
        setXAxisMin(domains.xMin.toString());
      }
      
      if (domains.xMax !== undefined) {
        setXAxisMax(domains.xMax.toString());
      }
      
      if (domains.yMin !== undefined) {
        setYAxisMin(domains.yMin.toString());
      }
      
      if (domains.yMax !== undefined) {
        setYAxisMax(domains.yMax.toString());
      }
    }
  }, [domains]);

  // Sync settings open state with UI
  useEffect(() => {
    // When settings panel is closed, reset the button state
    if (!isSettingsOpen) {
      // Reset any local state related to settings if needed
    }
  }, [isSettingsOpen]);

  const handleRotationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRotationValue(e.target.value);
  };

  const applyRotation = () => {
    const newRotation = parseFloat(rotationValue) || 0;
    setLocalRotation(newRotation);
    onRotationChange(newRotation);
  };

  const applyAxisLimits = () => {
    const newDomains = {
      xMin: xAxisMin !== "" ? parseFloat(xAxisMin) : undefined,
      xMax: xAxisMax !== "" ? parseFloat(xAxisMax) : undefined,
      yMin: yAxisMin !== "" ? parseFloat(yAxisMin) : undefined,
      yMax: yAxisMax !== "" ? parseFloat(yAxisMax) : undefined
    };
    
    setLocalDomains(newDomains);
  };

  // Create a custom style object with CSS variable for rotation
  const containerStyle = {
    zIndex,
    position: 'absolute' as const,
    left: position.x,
    top: position.y,
    width: isMinimized ? 300 : size.width,
    height: isMinimized ? 40 : size.height,
    transform: `rotate(${localRotation}deg)`,
    transformOrigin: 'center center',
    opacity: 1, // Full opacity for all graphs
    transition: isMinimized ? 'width 0.2s ease, height 0.2s ease' : 'transform 0.3s ease-in-out'
  };

  // Function to handle graph rotation with better sensitivity
  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Get the center point of the graph
    const rect = (e.currentTarget as HTMLElement).closest('.graph-container')?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate initial angle between cursor and center
    const initialDx = e.clientX - centerX;
    const initialDy = e.clientY - centerY;
    const initialAngle = Math.atan2(initialDy, initialDx) * (180 / Math.PI);
    
    // Starting rotation angle
    const startRotation = localRotation;
    
    function onMouseMove(moveEvent: MouseEvent) {
      // Calculate new angle
      const dx = moveEvent.clientX - centerX;
      const dy = moveEvent.clientY - centerY;
      const newAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      
      // Calculate angle difference (with sensitivity reduction)
      let angleDiff = newAngle - initialAngle;
      
      // Reduce sensitivity by dividing the angle change
      angleDiff = angleDiff / 2;
      
      // Update rotation
      const newRotation = (startRotation + angleDiff + 360) % 360;
      setLocalRotation(newRotation);
      onRotationChange(newRotation);
    }
    
    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Function to bring the graph to the top
  const bringToFront = () => {
    if (!containerRef.current) return;
    
    const currentGraphs = document.querySelectorAll('.graph-container');
    let maxZIndex = zIndex;
    currentGraphs.forEach((graph) => {
      const graphZIndex = parseInt(getComputedStyle(graph).zIndex);
      if (graphZIndex > maxZIndex) {
        maxZIndex = graphZIndex;
      }
    });
    
    // Only update if this isn't already the top graph
    if (maxZIndex > zIndex) {
      containerRef.current.style.zIndex = (maxZIndex + 1).toString();
    }
  };

  // Add click handler to bring graph to front when clicked
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      // Only bring to front if not clicking on a button or control
      if (
        !(e.target as HTMLElement).closest('button') &&
        !(e.target as HTMLElement).closest('input')
      ) {
        bringToFront();
      }
    };

    container.addEventListener('mousedown', handleClick);
    
    return () => {
      container.removeEventListener('mousedown', handleClick);
    };
  }, [zIndex]);

  // Memoize point rendering function to avoid recreating on every render
  const renderPoint = useCallback((props: any) => {
    const { cx, cy, fill } = props;
    
    if (renderStrategy.useSimplePoints) {
      // For extremely large datasets, use very simple points (no stroke, no effects)
      return (
        <circle
          cx={cx}
          cy={cy}
          r={renderStrategy.pointSize}
          fill={fill}
          opacity={data && data.length > 10000 ? 0.6 : 0.8}
        />
      );
    }
    
    // For smaller datasets, use nicer styling
    const useFilter = data ? data.length <= 200 : false;
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={renderStrategy.pointSize}
        fill={fill}
        strokeWidth={data?.length > 500 ? 0 : data?.length > 200 ? 1 : 2}
        stroke={data?.length > 500 ? undefined : "white"}
        filter={useFilter ? "url(#glow)" : undefined}
      />
    );
  }, [data?.length, renderStrategy]);

  return (
    <>
      <div 
        ref={containerRef}
        style={containerStyle} 
        className="graph-container"
      >
        <div className="bg-transparent border border-black rounded-lg shadow-lg h-full flex flex-col overflow-hidden">
          {/* Header with drag handle */}
          <div 
            className="handle bg-blue-50 p-2 border-b border-gray-200 flex justify-between items-center cursor-move"
            onMouseDown={(e) => handleDrag(e, 'move')}
            onDoubleClick={() => {
              if (isMinimized) {
                setIsMinimized(false);
              }
            }}
          >
            {/* Drag handle area */}
            <div className="flex-1 h-full flex items-center mr-2">
              <div className="mr-2 text-gray-400 hover:text-gray-600">
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </div>
              <h3 className="font-medium text-gray-800 truncate text-sm">
                {filename || 'Graph'} ({localRotation.toFixed(1)}°)
              </h3>
            </div>
            
            {/* Controls */}
            <div className="flex space-x-1 z-10">
              {!isMinimized && (
                <>
                  <div 
                    className="relative w-8 h-8 cursor-grab active:cursor-grabbing rounded hover:bg-blue-100 flex items-center justify-center"
                    onMouseDown={handleRotate}
                    title="Drag to rotate"
                  >
                    <svg 
                      className="w-5 h-5 text-blue-500 hover:text-blue-600 transition-colors"
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="2" 
                        d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                      />
                    </svg>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none">
                      {localRotation.toFixed(1)}°
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDataPanelToggle();
                    }}
                    className="p-1 text-indigo-500 hover:text-indigo-700 rounded bg-white"
                    title="Edit Data"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3zm0 5h16" />
                    </svg>
                  </button>
                </>
              )}

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                }}
                className="p-1 text-gray-500 hover:text-gray-700 rounded bg-white"
                title={isMinimized ? "Restore" : "Minimize"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMinimized ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                  )}
                </svg>
              </button>
              
              {/* Always show the settings and close buttons, even when minimized */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSettings();
                }}
                className={`p-1 rounded transition-colors duration-200 ${
                  isSettingsOpen 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Settings"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="p-1 text-red-500 hover:text-red-700 rounded bg-white"
                title="Close graph"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Graph content */}
          {!isMinimized && (
            <div className="flex-1 p-2 relative">
              <ResponsiveContainer 
                width="100%" 
                height="100%"
                onResize={(width, height) => {
                  if (width && height) {
                    setContentSize({ width, height });
                  }
                }}
              >
                <ScatterChart 
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  {/* Conditionally render grid based on data size */}
                  {(!data || data.length <= 300) ? (
                    <CartesianGrid 
                      stroke="rgba(0,0,0,0.15)" 
                      horizontal={true}
                      vertical={true}
                      strokeDasharray="0"
                    />
                  ) : data.length <= 1000 ? (
                    <CartesianGrid 
                      stroke="rgba(0,0,0,0.15)" 
                      horizontal={true}
                      vertical={true}
                      strokeDasharray="0"
                      // Five equal intervals (matching the axis ticks)
                      horizontalPoints={[0.2, 0.4, 0.6, 0.8].map(
                        factor => {
                          const yMin = scaledDomains.yMin ?? 0;
                          const yMax = scaledDomains.yMax ?? 100;
                          return yMin + (yMax - yMin) * factor;
                        }
                      )}
                      verticalPoints={[0.2, 0.4, 0.6, 0.8].map(
                        factor => {
                          const xMin = scaledDomains.xMin ?? 0;
                          const xMax = scaledDomains.xMax ?? 100;
                          return xMin + (xMax - xMin) * factor;
                        }
                      )}
                    />
                  ) : (
                    <CartesianGrid 
                      stroke="rgba(0,0,0,0.15)" 
                      horizontal={true}
                      vertical={true}
                      strokeDasharray="0"
                      strokeWidth={1}
                      // Five equal intervals (matching the axis ticks)
                      horizontalPoints={[0.2, 0.4, 0.6, 0.8].map(
                        factor => {
                          const yMin = scaledDomains.yMin ?? 0;
                          const yMax = scaledDomains.yMax ?? 100;
                          return yMin + (yMax - yMin) * factor;
                        }
                      )}
                      verticalPoints={[0.2, 0.4, 0.6, 0.8].map(
                        factor => {
                          const xMin = scaledDomains.xMin ?? 0;
                          const xMax = scaledDomains.xMax ?? 100;
                          return xMin + (xMax - xMin) * factor;
                        }
                      )}
                    />
                  )}
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    domain={
                      quadrantMode === 'all' 
                        ? [
                          scaledDomains.xMin !== undefined ? scaledDomains.xMin : (dataMin: number) => Math.min(dataMin, 0), 
                          scaledDomains.xMax !== undefined ? scaledDomains.xMax : (dataMax: number) => Math.max(dataMax, 0)
                        ]
                        : [
                          scaledDomains.xMin !== undefined ? scaledDomains.xMin : 0, 
                          scaledDomains.xMax !== undefined ? scaledDomains.xMax : 'auto'
                        ]
                    } 
                    allowDataOverflow={true}
                    includeHidden={true}
                    allowDecimals={true}
                    // Force exactly 5 intervals by using explicit ticks
                    ticks={(() => {
                      const min = scaledDomains.xMin ?? 0;
                      const max = scaledDomains.xMax ?? 100;
                      const step = (max - min) / 5;
                      return [min, min + step, min + 2*step, min + 3*step, min + 4*step, max];
                    })()}
                    padding={{ left: 0, right: 0 }}
                    axisLine={{ stroke: '#000', strokeWidth: 1.5 }}
                    scale="linear"
                    // Remove interval specification to avoid conflict with ticks
                    // Reduce font size for better performance with large datasets
                    tick={{ fontSize: data && data.length > 1000 ? 10 : 12 }}
                    // Format ticks to avoid long decimal values
                    tickFormatter={(value) => {
                      // For integers or values close to integers
                      if (Math.abs(value - Math.round(value)) < 0.001) {
                        return Math.round(value).toString();
                      }
                      // For other values, limit decimal places
                      return value.toFixed(1);
                    }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    domain={
                      quadrantMode === 'all' 
                        ? [
                          scaledDomains.yMin !== undefined ? scaledDomains.yMin : (dataMin: number) => Math.min(dataMin, 0), 
                          scaledDomains.yMax !== undefined ? scaledDomains.yMax : (dataMax: number) => Math.max(dataMax, 0)
                        ]
                        : [
                          scaledDomains.yMin !== undefined ? scaledDomains.yMin : 0, 
                          scaledDomains.yMax !== undefined ? scaledDomains.yMax : 'auto'
                        ]
                    }
                    allowDataOverflow={true}
                    includeHidden={true}
                    allowDecimals={true}
                    // Force exactly 5 intervals by using explicit ticks
                    ticks={(() => {
                      const min = scaledDomains.yMin ?? 0;
                      const max = scaledDomains.yMax ?? 100;
                      const step = (max - min) / 5;
                      return [min, min + step, min + 2*step, min + 3*step, min + 4*step, max];
                    })()}
                    padding={{ top: 0, bottom: 0 }}
                    axisLine={{ stroke: '#000', strokeWidth: 1.5 }}
                    scale="linear"
                    // Remove interval specification to avoid conflict with ticks
                    // Reduce font size for better performance with large datasets
                    tick={{ fontSize: data && data.length > 1000 ? 10 : 12 }}
                    // Format ticks to avoid long decimal values
                    tickFormatter={(value) => {
                      // For integers or values close to integers
                      if (Math.abs(value - Math.round(value)) < 0.001) {
                        return Math.round(value).toString();
                      }
                      // For other values, limit decimal places
                      return value.toFixed(1);
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', borderRadius: '4px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                    // Throttle tooltip updates for better performance with large datasets
                    isAnimationActive={data ? data.length <= 500 : true}
                    cursor={{ strokeDasharray: '3 3', stroke: 'rgba(50,50,50,0.4)' }}
                    // Custom content renderer for better performance
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) {
                        return null;
                      }
                      
                      // Simple lightweight tooltip for large datasets
                      const point = payload[0].payload;
                      return (
                        <div className="custom-tooltip" style={{
                          backgroundColor: 'white',
                          padding: '8px 12px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}>
                          <p className="tooltip-x"><strong>X:</strong> {point.x}</p>
                          <p className="tooltip-y"><strong>Y:</strong> {point.y}</p>
                        </div>
                      );
                    }}
                  />
                  <Scatter 
                    name="Data Points"
                    data={processedData}
                    fill={color}
                    stroke={color}
                    strokeWidth={2}
                    fillOpacity={0.8}
                    strokeOpacity={0.9}
                    shape={(props: any) => {
                      // Custom shape for optimal performance
                      const { cx, cy } = props;
                      return (
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={renderStrategy.pointSize} 
                          fill={color}
                          fillOpacity={0.8}
                          stroke={color}
                          strokeWidth={1.5}
                          strokeOpacity={0.9}
                        />
                      );
                    }}
                  />
                  {/* Filter for glow effect */}
                  <defs>
                    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  {quadrantMode === 'all' && (
                    <>
                      <ReferenceLine x={0} stroke="rgba(0,0,0,0.5)" strokeWidth={1} ifOverflow="extendDomain" />
                      <ReferenceLine y={0} stroke="rgba(0,0,0,0.5)" strokeWidth={1} ifOverflow="extendDomain" />
                    </>
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        
        {/* Resize Handlers */}
        {!isMinimized && (
          <>
            <div className="absolute top-0 left-0 w-full h-4 cursor-ns-resize resize-handle" 
                 onMouseDown={(e) => handleDrag(e, 'top')}></div>
            <div className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize resize-handle" 
                 onMouseDown={(e) => handleDrag(e, 'topRight')}></div>
            <div className="absolute bottom-0 left-0 w-full h-4 cursor-ns-resize resize-handle" 
                 onMouseDown={(e) => handleDrag(e, 'bottom')}></div>
            <div className="absolute top-0 left-0 h-full w-4 cursor-ew-resize resize-handle" 
                 onMouseDown={(e) => handleDrag(e, 'left')}></div>
            <div className="absolute top-0 right-0 h-full w-4 cursor-ew-resize resize-handle" 
                 onMouseDown={(e) => handleDrag(e, 'right')}></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize resize-handle" 
                 onMouseDown={(e) => handleDrag(e, 'bottomRight')}></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize resize-handle" 
                 onMouseDown={(e) => handleDrag(e, 'bottomLeft')}></div>
            <div className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize resize-handle" 
                 onMouseDown={(e) => handleDrag(e, 'topLeft')}></div>
          </>
        )}
      </div>
    </>
  );
  
  // Custom drag handler implementation
  function handleDrag(e: React.MouseEvent, direction: string) {
    e.preventDefault();
    
    // Don't start drag if we clicked on a button or input
    if ((e.target as HTMLElement).tagName === 'BUTTON' || 
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'SVG' ||
        (e.target as HTMLElement).tagName === 'path') {
      return;
    }
    
    // Bring this graph to the top when starting to drag
    const currentGraphs = document.querySelectorAll('.graph-container');
    let maxZIndex = zIndex;
    currentGraphs.forEach((graph) => {
      const graphZIndex = parseInt(getComputedStyle(graph).zIndex);
      if (graphZIndex > maxZIndex) {
        maxZIndex = graphZIndex;
      }
    });
    
    // Only update if this isn't already the top graph
    if (maxZIndex > zIndex) {
      const graphElement = e.currentTarget.closest('.graph-container') as HTMLElement;
      if (graphElement) {
        graphElement.style.zIndex = (maxZIndex + 1).toString();
      }
    }

    const initialX = e.clientX;
    const initialY = e.clientY;
    const initialLeft = position.x;
    const initialTop = position.y;
    const initialWidth = size.width;
    const initialHeight = size.height;
    const initialRotation = localRotation;
    
    // Handle mouse move
    function onMouseMove(moveEvent: MouseEvent) {
      const dx = moveEvent.clientX - initialX;
      const dy = moveEvent.clientY - initialY;
      
      // If just moving (not resizing)
      if (direction === 'move') {
        // Remove rotation transformation - move should be in screen coordinates, not graph coordinates
        onPositionChange(initialLeft + dx, initialTop + dy);
        return;
      }
      
      // Handle resizing based on direction
      let newWidth = initialWidth;
      let newHeight = initialHeight;
      let newLeft = initialLeft;
      let newTop = initialTop;
      
      // Define min/max constraints
      const minWidth = 250;
      const minHeight = 200;
      const maxWidth = 800;  // Hard limit regardless of window size
      const maxHeight = 600; // Hard limit regardless of window size
      
      if (direction.includes('right') && !direction.includes('top') && !direction.includes('bottom')) {
        newWidth = Math.max(minWidth, initialWidth + dx);
        newLeft = initialLeft;
      }
      if (direction.includes('bottom')) {
        newHeight = Math.max(minHeight, initialHeight + dy);
        newTop = initialTop;
      }
      if (direction.includes('left')) {
        const widthChange = dx;
        newWidth = Math.max(minWidth, initialWidth - widthChange);
        newLeft = initialLeft + widthChange;
      }
      if (direction.includes('top')) {
        const heightChange = dy;
        newHeight = Math.max(minHeight, initialHeight - heightChange);
        newTop = initialTop + heightChange;
      }
      
      // Handle resizing based on diagonal directions
      if (direction === 'topRight') {
        newWidth = Math.max(minWidth, initialWidth + dx);
        newHeight = Math.max(minHeight, initialHeight - dy);
        newTop = initialTop + dy;
      }
      if (direction === 'bottomRight') {
        newWidth = Math.max(minWidth, initialWidth + dx);
        newHeight = Math.max(minHeight, initialHeight + dy);
      }
      if (direction === 'bottomLeft') {
        newWidth = Math.max(minWidth, initialWidth - dx);
        newLeft = initialLeft + dx;
        newHeight = Math.max(minHeight, initialHeight + dy);
      }
      if (direction === 'topLeft') {
        newWidth = Math.max(minWidth, initialWidth - dx);
        newLeft = initialLeft + dx;
        newHeight = Math.max(minHeight, initialHeight - dy);
        newTop = initialTop + dy;
      }
      
      // Apply maximum constraints to prevent windows from growing too large
      newWidth = Math.min(newWidth, maxWidth);
      newHeight = Math.min(newHeight, maxHeight);
      
      // Recalculate position if max size was reached to prevent jumps
      if (direction.includes('left') && newWidth === maxWidth) {
        newLeft = initialLeft + initialWidth - maxWidth;
      }
      if (direction.includes('top') && newHeight === maxHeight) {
        newTop = initialTop + initialHeight - maxHeight;
      }
      
      // Only update if there's an actual change to avoid unnecessary re-renders
      if (newLeft !== position.x || newTop !== position.y) {
        onPositionChange(newLeft, newTop);
      }
      
      if (newWidth !== size.width || newHeight !== size.height) {
        onSizeChange(newWidth, newHeight);
        
        // Trigger recalculation of axes and domains when resizing
        const xValues = data.map(point => point.x);
        const yValues = data.map(point => point.y);
        
        const dataMin = {
          x: Math.min(...xValues),
          y: Math.min(...yValues)
        };
        
        const dataMax = {
          x: Math.max(...xValues),
          y: Math.max(...yValues)
        };
        
        // Use provided domains or calculate from data
        const domainValues = {
          xMin: localDomains.xMin !== undefined ? localDomains.xMin : (quadrantMode === 'all' ? Math.min(dataMin.x, 0) : 0),
          xMax: localDomains.xMax !== undefined ? localDomains.xMax : dataMax.x,
          yMin: localDomains.yMin !== undefined ? localDomains.yMin : (quadrantMode === 'all' ? Math.min(dataMin.y, 0) : 0),
          yMax: localDomains.yMax !== undefined ? localDomains.yMax : dataMax.y
        };
        
        // Add small padding to ensure points don't sit on the edge
        const xPadding = (domainValues.xMax - domainValues.xMin) * 0.05;
        const yPadding = (domainValues.yMax - domainValues.yMin) * 0.05;
        
        setScaledDomains({
          xMin: domainValues.xMin - xPadding,
          xMax: domainValues.xMax + xPadding,
          yMin: domainValues.yMin - yPadding,
          yMax: domainValues.yMax + yPadding
        });
      }
    }
    
    // Handle mouse up
    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
    
    // Add event listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
} 