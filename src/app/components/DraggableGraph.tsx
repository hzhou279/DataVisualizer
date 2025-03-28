'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import React from 'react';
import { useGridSystem } from './GlobalCoordinateGrid';
import ErrorBoundary from './ErrorBoundary';

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
  onAxisIntervalsChange?: (intervals: { x: number; y: number }) => void;
  onDomainsChange?: (domains: { xMin?: number; xMax?: number; yMin?: number; yMax?: number }) => void;
  quadrantMode?: 'first' | 'all';
  onDataPanelToggle: () => void;
  globalCoordinate?: { x: number; y: number };
  rotationCenter?: { x: number; y: number };
  onClick?: () => void;
  snapToGrid?: boolean;
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
  onAxisIntervalsChange,
  onDomainsChange,
  quadrantMode = 'first',
  onDataPanelToggle,
  globalCoordinate = { x: 0, y: 0 },
  rotationCenter = { x: 0, y: 0 },
  onClick,
  snapToGrid = true,
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
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCoordinateTooltip, setShowCoordinateTooltip] = useState(false);
  const [currentCoordinates, setCurrentCoordinates] = useState({ x: 0, y: 0 });
  
  // Reference to the container element
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Use the grid system with proper typing
  interface GridSystemType {
    gridSize: number;
    snapToGrid: (x: number, y: number) => { x: number, y: number };
    screenToGrid?: (x: number, y: number) => { x: number, y: number };
    gridToScreen?: (x: number, y: number) => { x: number, y: number };
    getPadding?: () => { LEFT: number, TOP: number, RIGHT: number, BOTTOM: number };
    getDimensions?: () => { width: number, height: number };
  }
  
  let gridSystem: GridSystemType;
  try {
    gridSystem = useGridSystem();
  } catch (error) {
    // Provide fallback when grid context is not available
    console.warn("Grid context not available in DraggableGraph");
    gridSystem = {
      gridSize: 50,
      snapToGrid: (x: number, y: number) => ({ x, y }),
      screenToGrid: (x: number, y: number) => ({ x, y }) // Add fallback implementation
    };
  }

  // Get initial position in grid coordinates
  const getGridPosition = (x: number, y: number) => {
    if (gridSystem.screenToGrid) {
      return gridSystem.screenToGrid(x, y);
    }
    // Fallback if screenToGrid is not available
    return { x, y };
  };

  // Create a memoized resize handler with the correct dependencies
  const createResizeHandler = useCallback(() => {
    if (!isMinimized && data && data.length > 0) {
      // Store initial dimensions for this handler instance
      const initialGraphWidth = size.width;
      const initialGraphHeight = size.height;
      const initialWindowWidth = window.innerWidth;
      const initialWindowHeight = window.innerHeight;
      
      console.log(`Setting up resize handler - Graph: ${initialGraphWidth}x${initialGraphHeight}, Window: ${initialWindowWidth}x${initialWindowHeight}`);
      
      // Return the actual resize handler function
      return () => {
        const currentWindowWidth = window.innerWidth;
        const currentWindowHeight = window.innerHeight;
        
        // Skip if no actual window size change
        if (currentWindowWidth === initialWindowWidth && currentWindowHeight === initialWindowHeight) {
          return;
        }
        
        // Calculate the change ratio for both dimensions
        const widthRatio = currentWindowWidth / initialWindowWidth;
        const heightRatio = currentWindowHeight / initialWindowHeight;
        
        console.log(`Window resize detected - Current: ${currentWindowWidth}x${currentWindowHeight}, Ratio W:${widthRatio.toFixed(2)} H:${heightRatio.toFixed(2)}`);
        
        // Calculate new dimensions - using the ratio to scale from initial size
        let newWidth = Math.round(initialGraphWidth * widthRatio);
        let newHeight = Math.round(initialGraphHeight * heightRatio);
        
        // Apply min/max constraints
        const minWidth = Math.min(250, currentWindowWidth * 0.6);  // Allow smaller widths on very small screens
        const minHeight = Math.min(200, currentWindowHeight * 0.5); // Allow smaller heights on very small screens
        const maxWidth = Math.min(800, currentWindowWidth * 0.9);  // Allow up to 90% of window width
        const maxHeight = Math.min(600, currentWindowHeight * 0.8); // Allow up to 80% of window height
        
        // Ensure we don't try to make the graph larger than the available space
        newWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
        newHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);
        
        console.log(`New graph size: ${size.width}x${size.height} -> ${newWidth}x${newHeight}`);
        
        // Only update if dimensions actually changed
        if (newWidth !== size.width || newHeight !== size.height) {
          // Ensure position is still valid (not off-screen)
          let newX = position.x;
          let newY = position.y;
          
          // If the graph would be positioned outside the visible area after resize, adjust position
          if (newX + newWidth > currentWindowWidth) {
            newX = Math.max(0, currentWindowWidth - newWidth - 20);
          }
          
          if (newY + newHeight > currentWindowHeight) {
            newY = Math.max(0, currentWindowHeight - newHeight - 20);
          }
          
          // Update position if it changed
          if (newX !== position.x || newY !== position.y) {
            onPositionChange(newX, newY);
          }
          
          // Update size
          onSizeChange(newWidth, newHeight);
        }
      };
    }
    return undefined;
  }, [isMinimized, data, size.width, size.height, onSizeChange, position.x, position.y, onPositionChange]);

  // Handle window resize
  useEffect(() => {
    const handleResize = createResizeHandler();
    
    if (handleResize) {
      // Call resize handler on initial load to ensure proper sizing
      setTimeout(handleResize, 100);
      
      window.addEventListener('resize', handleResize);
      // Also handle the load event to ensure proper sizing after the window fully loads
      window.addEventListener('load', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('load', handleResize);
      };
    }
  }, [createResizeHandler]);
  
  // Handle click action for the settings button
  const handleSettingsButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // No need to track internal state, just call the parent toggle function
    onToggleSettings();
  };

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
    
    console.log(`DEBUG calculatedDomains - Actual Data Range: X:[${dataMin.x}, ${dataMax.x}], Y:[${dataMin.y}, ${dataMax.y}]`);
    console.log(`DEBUG calculatedDomains - Input localDomains: `, localDomains);
    
    // Check if we have explicitly set domains
    const hasExplicitXMin = localDomains.xMin !== undefined;
    const hasExplicitXMax = localDomains.xMax !== undefined;
    const hasExplicitYMin = localDomains.yMin !== undefined;
    const hasExplicitYMax = localDomains.yMax !== undefined;
    
    // Use provided domains but ensure all data points are included
    // For explicitly set domains, take the more inclusive value between
    // the user-specified domain and the actual data range
    const domainValues = {
      xMin: hasExplicitXMin ? Math.min(localDomains.xMin as number, dataMin.x) : 
            (quadrantMode === 'all' ? Math.min(dataMin.x, 0) : (dataMin.x < 0 ? dataMin.x : 0)),
      xMax: hasExplicitXMax ? Math.max(localDomains.xMax as number, dataMax.x) : dataMax.x,
      yMin: hasExplicitYMin ? Math.min(localDomains.yMin as number, dataMin.y) : 
            (quadrantMode === 'all' ? Math.min(dataMin.y, 0) : (dataMin.y < 0 ? dataMin.y : 0)),
      yMax: hasExplicitYMax ? Math.max(localDomains.yMax as number, dataMax.y) : dataMax.y
    };
    
    console.log(`DEBUG calculatedDomains - Initial Domain Values: X:[${domainValues.xMin}, ${domainValues.xMax}], Y:[${domainValues.yMin}, ${domainValues.yMax}]`);
    
    // Calculate data ranges to determine appropriate padding
    const xRange = (domainValues.xMax ?? 0) - (domainValues.xMin ?? 0);
    const yRange = (domainValues.yMax ?? 0) - (domainValues.yMin ?? 0);
    
    // Add small padding for better visualization
    // Even for explicitly set domains, add a bit of padding to avoid points at the edges
    const paddingFactor = 0.05; // 5% padding
    
    const result = {
      xMin: (domainValues.xMin ?? 0) - (xRange * paddingFactor),
      xMax: (domainValues.xMax ?? 0) + (xRange * paddingFactor),
      yMin: (domainValues.yMin ?? 0) - (yRange * paddingFactor),
      yMax: (domainValues.yMax ?? 0) + (yRange * paddingFactor)
    };
    
    console.log(`DEBUG calculatedDomains - Final Padded Domains: X:[${result.xMin}, ${result.xMax}], Y:[${result.yMin}, ${result.yMax}]`);
    
    return result;
  }, [data, localDomains, quadrantMode]);

  // Update scaled domains when domains are calculated
  useEffect(() => {
    setScaledDomains(calculatedDomains);
    
    // Notify parent component of domain changes when auto-calculated
    // Only do this when domains are calculated automatically (first load or significant data changes)
    if (onDomainsChange && data && data.length > 0 && !domains) {
      // Report the calculated domains without padding to make them more intuitive for users
      const dataDomains = {
        xMin: calculatedDomains.xMin,
        xMax: calculatedDomains.xMax,
        yMin: calculatedDomains.yMin,
        yMax: calculatedDomains.yMax
      };
      
      onDomainsChange(dataDomains);
    }
    
    // Calculate optimal axis intervals based on the data range and notify parent
    // Only perform this calculation when the graph is first loaded (no axisIntervals set yet)
    // or when domains change significantly
    if (onAxisIntervalsChange && data && data.length > 0 && !axisIntervals) {
      const xRange = (calculatedDomains.xMax ?? 100) - (calculatedDomains.xMin ?? 0);
      const yRange = (calculatedDomains.yMax ?? 100) - (calculatedDomains.yMin ?? 0);
      
      // Calculate optimal interval count based on range magnitude
      // This is a heuristic that works well for most data ranges
      const calculateOptimalIntervals = (range: number): number => {
        if (range <= 0) return 5; // Default for invalid ranges
        
        // Get magnitude of the range
        const magnitude = Math.floor(Math.log10(range));
        const normalizedRange = range / Math.pow(10, magnitude);
        
        // Choose interval count based on normalized range
        if (normalizedRange <= 1) return 5;
        else if (normalizedRange <= 2.5) return 5;
        else if (normalizedRange <= 5) return 5;
        else return 10;
      };
      
      const optimalIntervals = {
        x: calculateOptimalIntervals(xRange),
        y: calculateOptimalIntervals(yRange)
      };
      
      // Only notify if the calculated intervals are different from current ones
      onAxisIntervalsChange(optimalIntervals);
    }
  }, [calculatedDomains, data, onAxisIntervalsChange, axisIntervals, onDomainsChange, domains]);

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
      
      // Preserve full precision of domain values
      if (domains.xMin !== undefined) {
        setXAxisMin(String(domains.xMin));
      }
      
      if (domains.xMax !== undefined) {
        setXAxisMax(String(domains.xMax));
      }
      
      if (domains.yMin !== undefined) {
        setYAxisMin(String(domains.yMin));
      }
      
      if (domains.yMax !== undefined) {
        setYAxisMax(String(domains.yMax));
      }
    }
  }, [domains]);

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

  // Calculate transform for rotation using rotation center
  const transformStyle = useMemo(() => {
    // Use rotation center as pivot point for rotation
    // Convert global rotation center to local coordinates
    const localCenterX = rotationCenter.x - globalCoordinate.x;
    const localCenterY = rotationCenter.y - globalCoordinate.y;
    
    // Transform string that rotates around the specified center
    return `rotate(${localRotation}deg) translate(${-localCenterX}px, ${-localCenterY}px) rotate(${-localRotation}deg) translate(${localCenterX}px, ${localCenterY}px)`;
  }, [localRotation, rotationCenter, globalCoordinate]);

  // Style for the component
  const containerStyle = {
    position: 'absolute' as const,
    left: position.x,
    top: position.y,
    width: isMinimized ? 300 : size.width,
    height: isMinimized ? 40 : size.height,
    transform: `rotate(${localRotation}deg)`,
    transformOrigin: 'center center',
    zIndex: 100, // Set all graphs to same z-index
    backgroundColor: 'transparent',
    transition: isMinimized ? 'width 0.2s ease, height 0.2s ease' : 'transform 0.3s ease-in-out'
  };

  // Function to handle rotation
  const handleRotate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Set flag to enable smooth rotation animation
    setIsAnimating(true);
    
    // Get the center of rotation (using specified rotation center)
    const graphRect = containerRef.current?.getBoundingClientRect();
    if (!graphRect) return;
    
    // Calculate local coordinates of rotation center
    const centerX = rotationCenter.x - globalCoordinate.x;
    const centerY = rotationCenter.y - globalCoordinate.y;
    
    // Get initial angle from mouse position to rotation center
    const initialAngle = Math.atan2(
      e.clientY - (graphRect.top + centerY),
      e.clientX - (graphRect.left + centerX)
    ) * (180 / Math.PI);

    function onMouseMove(moveEvent: MouseEvent) {
      if (!containerRef.current || !graphRect) return;
      
      // Calculate new angle from current mouse position to rotation center
      const newAngle = Math.atan2(
        moveEvent.clientY - (graphRect.top + centerY),
        moveEvent.clientX - (graphRect.left + centerX)
      ) * (180 / Math.PI);
      
      // Calculate rotation change
      let deltaAngle = newAngle - initialAngle;
      
      // Normalize to keep within 0-360 range
      let newRotation = (localRotation + deltaAngle) % 360;
      if (newRotation < 0) newRotation += 360;
      
      // Update the local rotation state for UI responsiveness
      setLocalRotation(newRotation);
      setRotationValue(newRotation.toFixed(1));
    }

    function onMouseUp() {
      // Clean up event listeners
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      // Apply rotation to parent component
      onRotationChange(localRotation);
      
      // Disable animation after rotation completes
      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    }
    
    // Add event listeners
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

  // Force sync settings button state with isSettingsOpen prop
  useEffect(() => {
    // Find the settings button in the DOM
    const container = containerRef.current;
    if (!container) return;
    
    const settingsButton = container.querySelector('[data-active]') as HTMLButtonElement;
    if (!settingsButton) return;
    
    // Manually update the button's state
    settingsButton.dataset.active = isSettingsOpen ? "true" : "false";
    
    // Update button styling
    if (isSettingsOpen) {
      settingsButton.classList.remove('bg-white', 'text-gray-500', 'hover:text-gray-700', 'hover:bg-gray-100');
      settingsButton.classList.add('bg-blue-500', 'text-white', 'hover:bg-blue-600', 'shadow-sm');
    } else {
      settingsButton.classList.remove('bg-blue-500', 'text-white', 'hover:bg-blue-600', 'shadow-sm');
      settingsButton.classList.add('bg-white', 'text-gray-500', 'hover:text-gray-700', 'hover:bg-gray-100');
    }
    
    console.log(`Settings button state updated: isSettingsOpen=${isSettingsOpen}`);
  }, [isSettingsOpen]);

  // Force re-render of chart when size changes
  const [chartKey, setChartKey] = useState(0);
  
  // When the size changes, force a re-render of the chart
  useEffect(() => {
    setChartKey(prev => prev + 1);
    console.log(`Forcing chart redraw due to size change: ${size.width}x${size.height}`);
  }, [size.width, size.height]);

  // Function to handle drag with grid snapping
  function handleDrag(e: React.MouseEvent, direction: string) {
    e.preventDefault();
    
    // Don't start drag if we clicked on a button or input
    if ((e.target as HTMLElement).tagName === 'BUTTON' || 
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'SVG' ||
        (e.target as HTMLElement).tagName === 'path') {
      return;
    }

    const initialX = e.clientX;
    const initialY = e.clientY;
    const initialLeft = position.x;
    const initialTop = position.y;
    const initialWidth = size.width;
    const initialHeight = size.height;
    
    // Get initial position in grid coordinates
    const initialGridPos = snapToGrid ? 
      getGridPosition(initialLeft + globalCoordinate.x, initialTop + globalCoordinate.y) : 
      { x: initialLeft + globalCoordinate.x, y: initialTop + globalCoordinate.y };
    
    // Update coordinate tooltip
    setCurrentCoordinates({
      x: initialLeft + globalCoordinate.x,
      y: initialTop + globalCoordinate.y
    });
    setShowCoordinateTooltip(true);
    
    // Handle mouse move
    function onMouseMove(moveEvent: MouseEvent) {
      const dx = moveEvent.clientX - initialX;
      const dy = moveEvent.clientY - initialY;
      
      // Set dragging state for styling
      if (!isDragging) {
        setIsDragging(true);
      }
      
      // If just moving (not resizing)
      if (direction === 'move') {
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;
        
        // Convert to global coordinates for display
        const globalX = newLeft + globalCoordinate.x;
        const globalY = newTop + globalCoordinate.y;
        
        // Update coordinate tooltip
        setCurrentCoordinates({ x: globalX, y: globalY });
        
        // Apply grid snapping if enabled
        if (snapToGrid) {
          const snapped = gridSystem.snapToGrid(globalX, globalY);
          // Convert back to local coordinates (subtract global offset)
          newLeft = snapped.x - globalCoordinate.x;
          newTop = snapped.y - globalCoordinate.y;
        }
        
        onPositionChange(newLeft, newTop);
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
      
      // Apply grid snapping to position if enabled
      if (snapToGrid && (direction.includes('left') || direction.includes('top'))) {
        const globalX = newLeft + globalCoordinate.x;
        const globalY = newTop + globalCoordinate.y;
        const snapped = gridSystem.snapToGrid(globalX, globalY);
        newLeft = snapped.x - globalCoordinate.x;
        newTop = snapped.y - globalCoordinate.y;
      }
      
      // Update coordinate tooltip with global position
      setCurrentCoordinates({
        x: newLeft + globalCoordinate.x,
        y: newTop + globalCoordinate.y
      });
      
      // Only update if there's an actual change to avoid unnecessary re-renders
      if (newLeft !== position.x || newTop !== position.y) {
        onPositionChange(newLeft, newTop);
      }
      
      if (newWidth !== size.width || newHeight !== size.height) {
        // Force chart key update to trigger re-render
        setChartKey(prev => prev + 1);
        
        // Update size
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
          xMin: localDomains.xMin !== undefined ? localDomains.xMin : (quadrantMode === 'all' ? Math.min(dataMin.x, 0) : (dataMin.x < 0 ? dataMin.x : 0)),
          xMax: localDomains.xMax !== undefined ? localDomains.xMax : dataMax.x,
          yMin: localDomains.yMin !== undefined ? localDomains.yMin : (quadrantMode === 'all' ? Math.min(dataMin.y, 0) : (dataMin.y < 0 ? dataMin.y : 0)),
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
      setIsDragging(false);
      setShowCoordinateTooltip(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
    
    // Add event listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  // Return the component with error boundary
  return (
    <ErrorBoundary
      fallback={
        <div 
          className="absolute border-2 border-red-400 bg-red-50 rounded-md shadow-md p-4 overflow-hidden"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${size.width}px`,
            height: `${size.height}px`,
            zIndex,
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-red-800 text-sm font-medium">Error in Graph: {filename}</h3>
            <button
              onClick={onRemove}
              className="p-1 hover:bg-red-200 rounded"
              aria-label="Remove graph"
            >
              <svg className="w-4 h-4 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-red-700">This graph encountered an error. You can remove it and try again.</p>
        </div>
      }
    >
      <div 
        ref={containerRef}
        style={containerStyle} 
        className="graph-container"
        onClick={(e) => {
          // Prevent propagation to avoid interactions with parent elements
          e.stopPropagation();
          // Call the onClick handler if provided
          if (onClick) onClick();
        }}
      >
        <div className="bg-transparent border border-black rounded-lg h-full flex flex-col overflow-hidden">
          {/* Header with semi-transparent background */}
          <div 
            className={`handle bg-white bg-opacity-80 p-2 border-b border-gray-200 flex justify-between items-center cursor-move ${isMinimized ? 'rounded-lg' : ''}`}
            onMouseDown={(e) => handleDrag(e, 'move')}
            onDoubleClick={() => {
              if (isMinimized) {
                setIsMinimized(false);
              }
            }}
          >
            {/* Drag handle area */}
            <div className={`flex-1 h-full flex items-center ${isMinimized ? 'mr-1' : 'mr-2'}`}>
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
                {filename || 'Data Graph'} {!isMinimized && `(${localRotation.toFixed(1)}°)`}
              </h3>
            </div>
            
            {/* Controls */}
            <div className={`flex ${isMinimized ? 'space-x-0.5' : 'space-x-1'} z-10`}>
              {/* Rotation control - only visible when not minimized */}
              {!isMinimized && (
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
              )}
              
              {/* Data edit button - only visible when not minimized */}
              {!isMinimized && (
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
              )}

              {/* Minimize/Maximize button - always visible */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                }}
                className={`${isMinimized ? 'p-0.5' : 'p-1'} text-gray-500 hover:text-gray-700 rounded bg-white`}
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
              
              {/* Settings button - always visible */}
              <button 
                onClick={handleSettingsButtonClick}
                data-active={isSettingsOpen ? "true" : "false"}
                className={`${isMinimized ? 'p-0.5' : 'p-1'} rounded transition-colors duration-100 ${
                  isSettingsOpen 
                    ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm' 
                    : 'bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title={isSettingsOpen ? "Close Settings" : "Open Settings"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              {/* Close button - always visible */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className={`${isMinimized ? 'p-0.5' : 'p-1'} text-red-500 hover:text-red-700 rounded bg-white`}
                title="Close graph"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Graph content with transparent background */}
          {!isMinimized && (
            <div 
              className="flex-1 p-2 relative flex flex-col" 
              style={{ 
                minHeight: 0, 
                height: "calc(100% - 32px)",  // Subtract header height to ensure proper sizing
                backgroundColor: "transparent" // Completely transparent background
              }}
            >
              <ResponsiveContainer 
                key={chartKey}
                width="100%" 
                height="100%"
                debounce={50}
                minHeight={50}
                aspect={undefined}
                onResize={(width, height) => {
                  if (width && height) {
                    setContentSize({ width, height });
                    console.log(`Content resized to: ${width}x${height}`);
                  }
                }}
              >
                <ScatterChart 
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  style={{ background: "transparent" }} // Make chart background transparent
                >
                  {/* Simplified CartesianGrid approach to eliminate rendering issues */}
                  <CartesianGrid 
                    stroke="rgba(0,0,0,0.15)" 
                    strokeDasharray="0"
                    strokeWidth={data && data.length > 1000 ? 0.5 : 1}
                  />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    xAxisId={0}
                    domain={[scaledDomains.xMin ?? 0, scaledDomains.xMax ?? 100]} 
                    allowDataOverflow={false}
                    includeHidden={true}
                    allowDecimals={true}
                    // Generate nice ticks for better readability
                    ticks={(() => {
                      const min = scaledDomains.xMin ?? 0;
                      const max = scaledDomains.xMax ?? 100;
                      
                      // Use axisIntervals prop instead of fixed count
                      const intervalCount = axisIntervals?.x || 5; // Default to 5 intervals if not provided
                      
                      // Generate exactly intervalCount+1 ticks for intervalCount intervals
                      if (intervalCount <= 1) {
                        return [min, max]; // Minimum 2 ticks (1 interval)
                      }
                      
                      // Calculate exact step size without rounding to ensure exact interval count
                      const exactStepSize = (max - min) / intervalCount;
                      
                      // Generate ticks with exact interval count
                      const ticks = [];
                      for (let i = 0; i <= intervalCount; i++) {
                        const value = min + (exactStepSize * i);
                        ticks.push(parseFloat(value.toFixed(10))); // Fix floating point precision issues
                      }
                      
                      return ticks;
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
                    yAxisId={0}
                    domain={[scaledDomains.yMin ?? 0, scaledDomains.yMax ?? 100]}
                    allowDataOverflow={false}
                    includeHidden={true}
                    allowDecimals={true}
                    // Generate nice ticks for better readability
                    ticks={(() => {
                      const min = scaledDomains.yMin ?? 0;
                      const max = scaledDomains.yMax ?? 100;
                      
                      // Use axisIntervals prop instead of fixed count
                      const intervalCount = axisIntervals?.y || 5; // Default to 5 intervals if not provided
                      
                      // Generate exactly intervalCount+1 ticks for intervalCount intervals
                      if (intervalCount <= 1) {
                        return [min, max]; // Minimum 2 ticks (1 interval)
                      }
                      
                      // Calculate exact step size without rounding to ensure exact interval count
                      const exactStepSize = (max - min) / intervalCount;
                      
                      // Generate ticks with exact interval count
                      const ticks = [];
                      for (let i = 0; i <= intervalCount; i++) {
                        const value = min + (exactStepSize * i);
                        ticks.push(parseFloat(value.toFixed(10))); // Fix floating point precision issues
                      }
                      
                      return ticks;
                    })()}
                    padding={{ top: 0, bottom: 0 }}
                    axisLine={{ stroke: '#000', strokeWidth: 1.5 }}
                    scale="linear"
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
        
        {/* Coordinate tooltip - shows when dragging */}
        {showCoordinateTooltip && (
          <div 
            style={{
              position: 'absolute',
              top: '-40px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(30, 58, 138, 0.9)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              zIndex: 1000
            }}
          >
            Global coordinates: ({Math.round(currentCoordinates.x)}, {Math.round(currentCoordinates.y)})
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
} 