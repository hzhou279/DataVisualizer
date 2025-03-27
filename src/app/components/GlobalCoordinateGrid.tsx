import React, { useState, useEffect } from 'react';

interface GlobalCoordinateGridProps {
  gridSize: number;
  showLabels: boolean;
}

export default function GlobalCoordinateGrid({ gridSize = 50, showLabels = true }: GlobalCoordinateGridProps) {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1000,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Generate grid lines
  const generateGridLines = () => {
    const lines = [];
    const numXLines = Math.ceil(dimensions.width / gridSize);
    const numYLines = Math.ceil(dimensions.height / gridSize);

    // Vertical lines
    for (let i = 0; i <= numXLines; i++) {
      lines.push(
        <line
          key={`v-${i}`}
          x1={i * gridSize}
          y1={0}
          x2={i * gridSize}
          y2="100%"
          strokeWidth={1}
          stroke="rgba(107, 114, 128, 0.2)"
        />
      );
    }

    // Horizontal lines
    for (let i = 0; i <= numYLines; i++) {
      lines.push(
        <line
          key={`h-${i}`}
          x1={0}
          y1={i * gridSize}
          x2="100%"
          y2={i * gridSize}
          strokeWidth={1}
          stroke="rgba(107, 114, 128, 0.2)"
        />
      );
    }

    return lines;
  };

  // Generate intersection points and labels
  const generateIntersectionPoints = () => {
    const points = [];
    const numXPoints = Math.ceil(dimensions.width / (gridSize * 5));
    const numYPoints = Math.ceil(dimensions.height / (gridSize * 5));

    for (let x = 1; x <= numXPoints; x++) {
      for (let y = 1; y <= numYPoints; y++) {
        const xPos = x * gridSize * 5;
        const yPos = y * gridSize * 5;

        // Add point marker
        points.push(
          <circle
            key={`point-${x}-${y}`}
            cx={xPos}
            cy={yPos}
            r={2}
            fill="rgba(79, 70, 229, 0.6)"
          />
        );

        // Add coordinate label if showLabels is true
        if (showLabels) {
          points.push(
            <text
              key={`label-${x}-${y}`}
              x={xPos + 8}
              y={yPos - 8}
              fontSize="11"
              fill="rgba(79, 70, 229, 0.8)"
              className="coordinate-label"
            >
              ({xPos}, {yPos})
            </text>
          );
        }
      }
    }

    return points;
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg 
        width="100%" 
        height="100%" 
        className="absolute top-0 left-0"
        style={{ 
          strokeWidth: '1px',
          vectorEffect: 'non-scaling-stroke'
        }}
      >
        {/* Grid lines */}
        {generateGridLines()}
        
        {/* Intersection points and labels */}
        {generateIntersectionPoints()}
      </svg>
      
      {/* Info tooltip */}
      <div 
        className="absolute bottom-2 right-2 bg-white/90 px-3 py-1.5 rounded-md text-xs text-gray-600 border border-gray-200 shadow-sm"
        style={{ zIndex: 1000, pointerEvents: 'auto' }}
      >
        Grid Size: {gridSize}px | Position coordinates shown at major intersections
      </div>
    </div>
  );
} 