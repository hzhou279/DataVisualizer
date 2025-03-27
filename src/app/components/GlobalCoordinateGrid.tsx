import React, { useState, useEffect } from 'react';

interface GlobalCoordinateGridProps {
  gridSize: number;
  showLabels: boolean;
}

const GlobalCoordinateGrid: React.FC<GlobalCoordinateGridProps> = ({ gridSize, showLabels }) => {
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

  // Generate horizontal grid lines
  const horizontalLines = [];
  for (let y = 0; y < dimensions.height; y += gridSize) {
    horizontalLines.push(
      <line 
        key={`h-${y}`}
        x1="0"
        y1={y}
        x2={dimensions.width}
        y2={y}
        stroke="rgba(200, 200, 220, 0.3)"
        strokeWidth="1"
      />
    );
    
    if (showLabels && y > 0) {
      horizontalLines.push(
        <text
          key={`h-text-${y}`}
          x="5"
          y={y - 5}
          fontSize="10"
          fill="rgba(100, 100, 150, 0.6)"
        >
          {y}
        </text>
      );
    }
  }

  // Generate vertical grid lines
  const verticalLines = [];
  for (let x = 0; x < dimensions.width; x += gridSize) {
    verticalLines.push(
      <line 
        key={`v-${x}`}
        x1={x}
        y1="0"
        x2={x}
        y2={dimensions.height}
        stroke="rgba(200, 200, 220, 0.3)"
        strokeWidth="1"
      />
    );
    
    if (showLabels && x > 0) {
      verticalLines.push(
        <text
          key={`v-text-${x}`}
          x={x + 5}
          y="15"
          fontSize="10"
          fill="rgba(100, 100, 150, 0.6)"
        >
          {x}
        </text>
      );
    }
  }

  // Generate intersection points with labels for better visual guidance
  const intersectionPoints = [];
  for (let x = gridSize; x < dimensions.width; x += gridSize * 5) {
    for (let y = gridSize; y < dimensions.height; y += gridSize * 5) {
      intersectionPoints.push(
        <circle
          key={`point-${x}-${y}`}
          cx={x}
          cy={y}
          r="3"
          fill="rgba(80, 100, 180, 0.4)"
        />
      );
      
      if (showLabels) {
        intersectionPoints.push(
          <text
            key={`point-text-${x}-${y}`}
            x={x + 5}
            y={y - 5}
            fontSize="9"
            fill="rgba(80, 100, 180, 0.6)"
          >
            ({x}, {y})
          </text>
        );
      }
    }
  }

  return (
    <div className="global-coordinate-grid" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
      <svg width="100%" height="100%">
        {horizontalLines}
        {verticalLines}
        {intersectionPoints}
      </svg>
      
      {/* Info tooltip about the grid */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: '10px', 
          right: '10px', 
          backgroundColor: 'rgba(255, 255, 255, 0.8)', 
          padding: '5px 10px', 
          borderRadius: '4px', 
          fontSize: '12px',
          color: '#555',
          border: '1px solid #ddd',
          zIndex: 1000,
          pointerEvents: 'auto'
        }}
      >
        Grid Size: {gridSize}px | Position coordinates shown at major intersections
      </div>
    </div>
  );
};

export default GlobalCoordinateGrid; 