import React, { useEffect, useState, useCallback } from 'react';

interface GlobalCoordinateGridProps {
  gridSize?: number;
  showLabels?: boolean;
}

export default function GlobalCoordinateGrid({ gridSize = 50, showLabels = true }: GlobalCoordinateGridProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Add padding for labels
  const PADDING = {
    LEFT: 40,   // Space for y-axis labels
    TOP: 30,    // Space for x-axis labels
    RIGHT: 20,  // Small right padding
    BOTTOM: 20  // Small bottom padding
  };

  // Update dimensions when container size changes
  const updateDimensions = useCallback(() => {
    const container = document.getElementById('grid-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      setDimensions({
        width: rect.width,
        height: rect.height
      });
      console.log('Grid container dimensions:', rect.width, rect.height); // Debug log
    }
  }, []);

  useEffect(() => {
    // Initial update
    updateDimensions();
    
    // Create a ResizeObserver for more reliable size updates
    const container = document.getElementById('grid-container');
    if (container) {
      const resizeObserver = new ResizeObserver(() => {
        updateDimensions();
      });
      
      resizeObserver.observe(container);
      
      // Cleanup
      return () => {
        resizeObserver.disconnect();
      };
    }
    
    // Fallback to window resize event
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  // Calculate grid lines and markers
  const generateGridMarkers = () => {
    const xMarkers = [];
    const yMarkers = [];
    
    // Calculate number of markers needed
    const xCount = Math.floor((dimensions.width - PADDING.LEFT - PADDING.RIGHT) / gridSize);
    const yCount = Math.floor((dimensions.height - PADDING.TOP - PADDING.BOTTOM) / gridSize);
    
    // Generate X-axis markers (every 100px)
    for (let i = 0; i <= xCount; i += 2) {
      const x = i * gridSize + PADDING.LEFT; // Offset by left padding
      xMarkers.push(
        <g key={`x-${x}`}>
          <line 
            x1={x} 
            y1={PADDING.TOP} 
            x2={x} 
            y2={PADDING.TOP + 10} 
            stroke="rgba(0,0,0,0.5)" 
            strokeWidth={1}
          />
          <text 
            x={x} 
            y={PADDING.TOP - 10} 
            textAnchor="middle" 
            fill="rgba(0,0,0,0.6)"
            fontSize={12}
            className="select-none"
          >
            {i * gridSize}
          </text>
        </g>
      );
    }
    
    // Generate Y-axis markers (every 100px)
    for (let i = 0; i <= yCount; i += 2) {
      const y = i * gridSize + PADDING.TOP; // Offset by top padding
      yMarkers.push(
        <g key={`y-${y}`}>
          <line 
            x1={PADDING.LEFT - 10} 
            y1={y} 
            x2={PADDING.LEFT} 
            y2={y} 
            stroke="rgba(0,0,0,0.5)" 
            strokeWidth={1}
          />
          <text 
            x={PADDING.LEFT - 15} 
            y={y + 4} 
            textAnchor="end" 
            fill="rgba(0,0,0,0.6)"
            fontSize={12}
            className="select-none"
          >
            {i * gridSize}
          </text>
        </g>
      );
    }

    return { xMarkers, yMarkers };
  };

  const { xMarkers, yMarkers } = generateGridMarkers();

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'hidden' }}>
      <svg 
        width="100%" 
        height="100%" 
        className="absolute inset-0"
        style={{ minWidth: '100%', minHeight: '100%' }}
      >
        <defs>
          <pattern 
            id="grid" 
            width={gridSize} 
            height={gridSize} 
            patternUnits="userSpaceOnUse"
            x={PADDING.LEFT}
            y={PADDING.TOP}
          >
            {/* Main grid lines */}
            <line 
              x1="0" 
              y1="0" 
              x2={gridSize} 
              y2="0" 
              stroke="rgba(0,0,0,0.2)" 
              strokeWidth={1}
            />
            <line 
              x1="0" 
              y1="0" 
              x2="0" 
              y2={gridSize} 
              stroke="rgba(0,0,0,0.2)" 
              strokeWidth={1}
            />
            {/* Dotted lines for better visibility */}
            <line
              x1="0"
              y1={gridSize/2}
              x2={gridSize}
              y2={gridSize/2}
              stroke="rgba(0,0,0,0.1)"
              strokeWidth={0.7}
              strokeDasharray="1,3"
            />
            <line
              x1={gridSize/2}
              y1="0"
              x2={gridSize/2}
              y2={gridSize}
              stroke="rgba(0,0,0,0.1)"
              strokeWidth={0.7}
              strokeDasharray="1,3"
            />
          </pattern>
        </defs>

        {/* Background grid with padding */}
        <rect 
          x={PADDING.LEFT} 
          y={PADDING.TOP} 
          width={dimensions.width - PADDING.LEFT - PADDING.RIGHT} 
          height={dimensions.height - PADDING.TOP - PADDING.BOTTOM} 
          fill="url(#grid)" 
          stroke="rgba(0,0,0,0.25)"
          strokeWidth={1}
        />

        {/* Draw explicit grid lines for better visibility */}
        <g>
          {/* Vertical grid lines */}
          {Array.from({ length: Math.floor((dimensions.width - PADDING.LEFT - PADDING.RIGHT) / gridSize) + 1 }).map((_, i) => (
            <line
              key={`v-${i}`}
              x1={PADDING.LEFT + i * gridSize}
              y1={PADDING.TOP}
              x2={PADDING.LEFT + i * gridSize}
              y2={dimensions.height - PADDING.BOTTOM}
              stroke="rgba(0,0,0,0.2)"
              strokeWidth={1}
            />
          ))}
          {/* Horizontal grid lines */}
          {Array.from({ length: Math.floor((dimensions.height - PADDING.TOP - PADDING.BOTTOM) / gridSize) + 1 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1={PADDING.LEFT}
              y1={PADDING.TOP + i * gridSize}
              x2={dimensions.width - PADDING.RIGHT}
              y2={PADDING.TOP + i * gridSize}
              stroke="rgba(0,0,0,0.2)"
              strokeWidth={1}
            />
          ))}
        </g>

        {/* Main axes with stronger visibility */}
        <line 
          x1={PADDING.LEFT} 
          y1={PADDING.TOP} 
          x2={dimensions.width - PADDING.RIGHT} 
          y2={PADDING.TOP} 
          stroke="rgba(0,0,0,0.5)" 
          strokeWidth={1.5} 
        />
        <line 
          x1={PADDING.LEFT} 
          y1={PADDING.TOP} 
          x2={PADDING.LEFT} 
          y2={dimensions.height - PADDING.BOTTOM} 
          stroke="rgba(0,0,0,0.5)" 
          strokeWidth={1.5} 
        />

        {/* Coordinate markers */}
        {showLabels && (
          <>
            {/* X-axis markers */}
            {xMarkers}
            {/* Y-axis markers */}
            {yMarkers}
          </>
        )}
      </svg>
    </div>
  );
} 