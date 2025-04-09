'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import FileUploader from './components/FileUploader';
import DraggableGraph from './components/DraggableGraph';
import { parseCSVData, validateCSVFormat, ParsedData } from './utils/csvParser';
import SettingsPanel from './components/SettingsPanel';
import DataPanel from './components/DataPanel';
import GlobalCoordinateGrid, { GridContextProvider } from './components/GlobalCoordinateGrid';
import ErrorBoundary from './components/ErrorBoundary';

type QuadrantMode = 'first' | 'all';

export interface Graph {
  id: string;
  filename?: string;
  data: ParsedData[];
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  color: string;
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
  zIndex?: number;
  title: string;
  minimized: boolean;
  settings: {
    showGrid: boolean;
    dotSize: number;
    showLabels: boolean;
    snapToGrid?: boolean;
  };
  globalCoordinate?: { x: number; y: number };
  rotationCenter?: { x: number; y: number };
}

export default function Home() {
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);
  const [selectedDataGraphId, setSelectedDataGraphId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [zIndexCounter, setZIndexCounter] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(50);
  const [showGridLabels, setShowGridLabels] = useState(true);
  const [colorIndex, setColorIndex] = useState(0);
  
  // Array of distinct colors for graphs
  const graphColors = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Green
    '#8b5cf6', // Purple
    '#f59e0b', // Amber
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#a855f7'  // Violet
  ];

  const handleFileProcessed = (parsedData: ParsedData[], fileName: string) => {
    try {
      if (!parsedData || !Array.isArray(parsedData) || parsedData.length === 0) {
        alert('No valid data points found in the file.');
        return;
      }

      // Check for valid data
      const validData = parsedData.filter(point => 
        point && 
        typeof point.x === 'number' && 
        typeof point.y === 'number' && 
        !isNaN(point.x) && 
        !isNaN(point.y) && 
        isFinite(point.x) && 
        isFinite(point.y)
      );
      
      if (validData.length === 0) {
        alert('No valid data points found in the file.');
        return;
      }

      // Extract the metadata from the first point (added by parseCSVData)
      const firstPoint = validData[0];
      const quadrantMode = firstPoint.quadrantMode || 'first';
      
      // Get domains from the parser - these already follow our requirements
      const domains = firstPoint.domains || {
        xMin: 0,
        xMax: 5000,
        yMin: 0,
        yMax: 5000
      };
      
      // Increment the z-index counter for each new graph
      setZIndexCounter(prev => prev + 1);
      
      // Use fixed reasonable sizes
      const initialWidth = 600;
      const initialHeight = 650;
      
      // Get current color and increment color index
      const currentColor = graphColors[colorIndex];
      setColorIndex((colorIndex + 1) % graphColors.length);
      
      // Create a new Graph object
      const newGraph: Graph = {
        id: Date.now().toString(),
        title: fileName || 'Graph',
        data: validData,
        position: getNextGraphPosition(graphs),
        size: { width: initialWidth, height: initialHeight },
        rotation: 0,
        color: currentColor,
        axisIntervals: { x: 5, y: 5 },
        quadrantMode: quadrantMode as QuadrantMode,
        domains,
        zIndex: zIndexCounter,
        minimized: false,
        settings: {
          showGrid: true,
          dotSize: 3,
          showLabels: true,
          snapToGrid: true
        },
        globalCoordinate: { x: 0, y: 0 },
        rotationCenter: { x: 0, y: 0 }
      };
      
      setGraphs(prevGraphs => [...prevGraphs, newGraph]);
    } catch (error) {
      console.error("Error processing file data:", error);
      alert('An error occurred while processing the file. Please try again with a different file.');
    }
  };

  const handlePositionUpdate = (graphId: string, x: number, y: number) => {
    setGraphs((prevGraphs) =>
      prevGraphs.map((graph) =>
        graph.id === graphId
          ? { ...graph, position: { x, y } }
          : graph
      )
    );
  };

  const handleSizeUpdate = (graphId: string, width: number, height: number) => {
    setGraphs((prevGraphs) =>
      prevGraphs.map((graph) =>
        graph.id === graphId
          ? { ...graph, size: { width, height } }
          : graph
      )
    );
  };

  const handleRotationUpdate = (graphId: string, rotation: number) => {
    setGraphs((prevGraphs) =>
      prevGraphs.map((graph) =>
        graph.id === graphId
          ? { ...graph, rotation }
          : graph
      )
    );
  };

  const handleColorChange = (graphId: string, color: string) => {
    setGraphs((prevGraphs) =>
      prevGraphs.map((graph) =>
        graph.id === graphId
          ? { ...graph, color }
          : graph
      )
    );
  };

  // Function to update axis intervals
  const handleAxisIntervalsUpdate = (graphId: string, intervals: { x: number; y: number }) => {
    setGraphs((prevGraphs) =>
      prevGraphs.map((graph) =>
        graph.id === graphId
          ? { ...graph, axisIntervals: intervals }
          : graph
      )
    );
  };

  // Function to update domains when automatically calculated
  const handleDomainsUpdate = (graphId: string, domains: { xMin?: number; xMax?: number; yMin?: number; yMax?: number }) => {
    setGraphs((prevGraphs) =>
      prevGraphs.map((graph) =>
        graph.id === graphId
          ? { ...graph, domains }
          : graph
      )
    );
  };

  // Function to remove a graph
  const handleRemoveGraph = (graphId: string) => {
    // Close any open panels for this graph
    if (selectedGraphId === graphId) {
      setSelectedGraphId(null);
      setShowSettings(false);
    }
    if (selectedDataGraphId === graphId) {
      setSelectedDataGraphId(null);
    }
    
    // Remove the graph
    setGraphs((prevGraphs) => prevGraphs.filter(graph => graph.id !== graphId));
  };

  const handleGraphUpdate = (graphId: string, updatedProps: Partial<Graph>) => {
    setGraphs(prevGraphs => 
      prevGraphs.map(graph => {
        if (graph.id === graphId) {
          // Handle domains from data if provided
          let updatedGraph = { ...graph, ...updatedProps };
          
          // If global coordinates are being updated, update the position
          if (updatedProps.globalCoordinate) {
            const currentGlobal = graph.globalCoordinate || { x: 0, y: 0 };
            const newGlobal = updatedProps.globalCoordinate;
            
            // Check if global coordinates actually changed to avoid unnecessary updates
            if (newGlobal.x !== currentGlobal.x || newGlobal.y !== currentGlobal.y) {
              // Calculate position delta based on global coordinate change
              const deltaX = newGlobal.x - currentGlobal.x;
              const deltaY = newGlobal.y - currentGlobal.y;
              
              // Update position to maintain the same visual position with new global coordinates
              updatedGraph.position = {
                x: graph.position.x + deltaX,
                y: graph.position.y + deltaY
              };
            }
          }
          
          if (updatedProps.data && updatedProps.data[0]?.domains) {
            // Extract domains from first data point if provided
            const { domains } = updatedProps.data[0];
            updatedGraph.domains = domains;
            // Remove domains from data points to avoid duplication
            updatedGraph.data = graph.data.map(point => {
              const { domains, ...rest } = point;
              return rest;
            });
          }
          
          return updatedGraph;
        }
        return graph;
      })
    );
  };

  // Function to handle graph data updates
  const handleDataUpdate = (graphId: string, updatedData: ParsedData[]) => {
    setGraphs(prevGraphs => 
      prevGraphs.map(graph => 
        graph.id === graphId ? { ...graph, data: updatedData } : graph
      )
    );
  };

  // Function to update z-index when a graph is selected
  const bringGraphToFront = (graphId: string) => {
    setZIndexCounter(prev => prev + 1);
    setGraphs(prevGraphs => 
      prevGraphs.map(graph => 
        graph.id === graphId 
          ? { ...graph, zIndex: zIndexCounter } 
          : graph
      )
    );
  };

  // Get the next position for a new graph to avoid overlapping
  const getNextGraphPosition = (existingGraphs: Graph[]) => {
    const offset = existingGraphs.length * 30;
    return { x: 100 + offset, y: 100 + offset };
  };

  const handleGraphSelect = (id: string) => {
    setSelectedGraphId(id);
    // Bring the selected graph to the front
    const updatedGraphs = graphs.map(graph => {
      if (graph.id === id) {
        setZIndexCounter(prev => prev + 1);
        return { ...graph, zIndex: zIndexCounter + 1 };
      }
      return graph;
    });
    setGraphs(updatedGraphs);
  };

  const handleGraphClose = (id: string) => {
    setGraphs(graphs.filter(graph => graph.id !== id));
    if (selectedGraphId === id) {
      setSelectedGraphId(null);
      setShowSettings(false);
    }
    if (selectedDataGraphId === id) {
      setSelectedDataGraphId(null);
    }
  };

  const handleGraphMove = (id: string, position: { x: number; y: number }) => {
    setGraphs(graphs.map(graph => graph.id === id ? { ...graph, position } : graph));
  };

  const handleGraphResize = (id: string, size: { width: number; height: number }) => {
    setGraphs(graphs.map(graph => graph.id === id ? { ...graph, size } : graph));
  };

  const handleGraphMinimize = (id: string) => {
    setGraphs(graphs.map(graph => graph.id === id ? { ...graph, minimized: !graph.minimized } : graph));
  };

  const handleSettingsOpen = (id: string) => {
    setSelectedGraphId(id);
    setShowSettings(true);
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
    setSelectedGraphId(null);
  };

  const handleDataPanelToggle = (id: string) => {
    setSelectedDataGraphId(selectedDataGraphId === id ? null : id);
  };

  const handleSettingsUpdate = (settings: any) => {
    if (!selectedGraphId) return;
    
    // Find the selected graph
    const graph = graphs.find(g => g.id === selectedGraphId);
    if (!graph) return;
    
    // Use handleGraphUpdate to apply all settings without checking for changes
    handleGraphUpdate(selectedGraphId, settings);
    
    // Reset selected graph ID after applying settings
    setShowSettings(false);
    setSelectedGraphId(null);
  };

  // Handle bringing a graph to the front when clicked
  const handleGraphClick = (id: string) => {
    // Find the maximum z-index
    const maxZIndex = Math.max(...graphs.map(g => g.zIndex || 0), 100);
    
    // Update the z-index for the clicked graph
    setGraphs(graphs.map(graph => 
      graph.id === id ? { ...graph, zIndex: maxZIndex + 1 } : graph
    ));
  };

  // Handler for dumping points from one graph to another
  const handleDumpPoints = (fromGraphId: string, toGraphId: string, transformedPoints: any[]) => {
    console.log(`handleDumpPoints in page.tsx called with:`, {
      fromGraphId,
      toGraphId,
      pointsCount: transformedPoints.length
    });
    
    // Find the source and target graphs
    const sourceGraph = graphs.find(g => g.id === fromGraphId);
    const targetGraph = graphs.find(g => g.id === toGraphId);
    
    if (!sourceGraph || !targetGraph) {
      console.error("Source or target graph not found:", {
        sourceGraphFound: !!sourceGraph,
        targetGraphFound: !!targetGraph,
        fromGraphId,
        toGraphId,
        availableGraphIds: graphs.map(g => g.id)
      });
      return;
    }
    
    console.log("Found source and target graphs:", {
      sourceTitle: sourceGraph.title,
      targetTitle: targetGraph.title
    });
    
    // Create a dialog to confirm the operation
    if (window.confirm(`Dump ${transformedPoints.length} points from "${sourceGraph.title}" to "${targetGraph.title}"?`)) {
      console.log("User confirmed point dumping");
      
      // Update the target graph with the new points
      setGraphs(prevGraphs => 
        prevGraphs.map(graph => {
          if (graph.id === toGraphId) {
            // Add metadata to the points to track their source and preserve their original color
            const pointsWithMetadata = transformedPoints.map(point => ({
              ...point,
              _source: sourceGraph.title,
              _sourceId: fromGraphId,
              _dumpedAt: new Date().toISOString(),
              // Preserve the color from the original point
              _originalColor: point._originalColor || sourceGraph.color,
              // Use a custom renderer key so that we can identify these points in the chart
              _isDumped: true
            }));
            
            console.log(`Adding ${pointsWithMetadata.length} points to target graph`);
            
            // Combine existing points with new points
            return {
              ...graph,
              data: [...graph.data, ...pointsWithMetadata]
            };
          }
          return graph;
        })
      );
      
      // Show success message
      alert(`Successfully dumped ${transformedPoints.length} points to "${targetGraph.title}"`);
    } else {
      console.log("User cancelled point dumping");
    }
  };

  const selectedGraph = graphs.find(graph => graph.id === selectedGraphId);
  const selectedDataGraph = graphs.find(graph => graph.id === selectedDataGraphId);

  return (
    <ErrorBoundary
      fallback={
        <div className="flex h-screen items-center justify-center bg-gray-100">
          <div className="p-6 max-w-sm bg-white rounded-lg border border-gray-200 shadow-md">
            <div className="flex items-center mb-4">
              <svg className="w-10 h-10 text-red-500 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-xl font-bold">Something went wrong</h2>
            </div>
            <p className="text-gray-700 mb-4">The application encountered an error. Please try refreshing the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error("Application Error:", error);
        console.error("Component Stack:", errorInfo.componentStack);
      }}
    >
      <div className="flex h-screen overflow-hidden bg-gray-100">
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header with controls */}
          <div className="flex justify-between items-center p-3 bg-white border-b">
            <div className="flex items-center space-x-6">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">CSV Graph Visualizer</h1>
                <p className="text-sm text-gray-500">Upload CSV files to visualize data</p>
              </div>
              <button 
                onClick={() => setShowGrid(!showGrid)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  showGrid ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {showGrid ? 'Hide Grid' : 'Show Grid'}
              </button>
            </div>
            <div className="w-52">
              <FileUploader onDataParsed={handleFileProcessed} />
            </div>
          </div>

          {/* White board container - maximized size */}
          <div className="flex-1 bg-white relative overflow-hidden min-h-0" id="grid-container">
            {/* Global coordinate grid - taking full space */}
            <div className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
              <GridContextProvider gridSize={gridSize}>
                {showGrid && (
                  <GlobalCoordinateGrid gridSize={gridSize} showLabels={showGridLabels}>
                    {/* Graphs container */}
                    <div className="relative h-full" style={{ zIndex: 2 }}>
                      {graphs.length > 0 ? (
                        graphs.map((graph) => (
                          <DraggableGraph
                            key={graph.id}
                            {...graph}
                            id={graph.id}
                            filename={graph.title}
                            zIndex={graph.zIndex || 100}
                            onPositionChange={(x, y) => handlePositionUpdate(graph.id, x, y)}
                            onSizeChange={(width, height) => handleSizeUpdate(graph.id, width, height)}
                            onRotationChange={(rotation) => handleRotationUpdate(graph.id, rotation)}
                            onColorChange={(color) => handleColorChange(graph.id, color)}
                            onAxisIntervalsChange={(intervals) => handleAxisIntervalsUpdate(graph.id, intervals)}
                            onDomainsChange={(domains) => handleDomainsUpdate(graph.id, domains)}
                            onRemove={() => handleRemoveGraph(graph.id)}
                            isSettingsOpen={selectedGraphId === graph.id}
                            onToggleSettings={() => {
                              if (selectedGraphId === graph.id) {
                                setSelectedGraphId(null);
                                setShowSettings(false);
                              } else {
                                setSelectedGraphId(graph.id);
                                setShowSettings(true);
                                if (selectedDataGraphId !== graph.id) {
                                  setSelectedDataGraphId(null);
                                }
                              }
                            }}
                            onDataPanelToggle={() => {
                              if (selectedDataGraphId === graph.id) {
                                setSelectedDataGraphId(null);
                              } else {
                                setSelectedDataGraphId(graph.id);
                                if (selectedGraphId !== graph.id) {
                                  setSelectedGraphId(null);
                                }
                              }
                            }}
                            onClick={() => handleGraphClick(graph.id)}
                            snapToGrid={graph.settings?.snapToGrid !== false}
                            allGraphs={graphs}
                            onDumpPoints={handleDumpPoints}
                          />
                        ))
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="bg-blue-50 p-6 rounded-full inline-block mb-4">
                              <svg className="h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No graphs yet</h3>
                            <p className="text-gray-500 mt-1">Upload a CSV file to get started</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </GlobalCoordinateGrid>
                )}
                {!showGrid && (
                  <div className="relative h-full" style={{ zIndex: 2 }}>
                    {graphs.length > 0 ? (
                      graphs.map((graph) => (
                        <DraggableGraph
                          key={graph.id}
                          {...graph}
                          id={graph.id}
                          filename={graph.title}
                          zIndex={graph.zIndex || 100}
                          onPositionChange={(x, y) => handlePositionUpdate(graph.id, x, y)}
                          onSizeChange={(width, height) => handleSizeUpdate(graph.id, width, height)}
                          onRotationChange={(rotation) => handleRotationUpdate(graph.id, rotation)}
                          onColorChange={(color) => handleColorChange(graph.id, color)}
                          onAxisIntervalsChange={(intervals) => handleAxisIntervalsUpdate(graph.id, intervals)}
                          onDomainsChange={(domains) => handleDomainsUpdate(graph.id, domains)}
                          onRemove={() => handleRemoveGraph(graph.id)}
                          isSettingsOpen={selectedGraphId === graph.id}
                          onToggleSettings={() => {
                            if (selectedGraphId === graph.id) {
                              setSelectedGraphId(null);
                              setShowSettings(false);
                            } else {
                              setSelectedGraphId(graph.id);
                              setShowSettings(true);
                              if (selectedDataGraphId !== graph.id) {
                                setSelectedDataGraphId(null);
                              }
                            }
                          }}
                          onDataPanelToggle={() => {
                            if (selectedDataGraphId === graph.id) {
                              setSelectedDataGraphId(null);
                            } else {
                              setSelectedDataGraphId(graph.id);
                              if (selectedGraphId !== graph.id) {
                                setSelectedGraphId(null);
                              }
                            }
                          }}
                          onClick={() => handleGraphClick(graph.id)}
                          snapToGrid={false}
                          allGraphs={graphs}
                          onDumpPoints={handleDumpPoints}
                        />
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="bg-blue-50 p-6 rounded-full inline-block mb-4">
                            <svg className="h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-medium text-gray-900">No graphs yet</h3>
                          <p className="text-gray-500 mt-1">Upload a CSV file to get started</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </GridContextProvider>
            </div>
          </div>
        </div>

        {/* Side panels */}
        <div className={`fixed left-0 top-0 h-full w-80 bg-white border-r shadow-xl transform transition-transform duration-300 z-50 ${selectedDataGraphId ? 'translate-x-0' : '-translate-x-full'}`}>
          {selectedDataGraph && (
            <DataPanel 
              graph={selectedDataGraph}
              onDataUpdate={handleDataUpdate}
              onClose={() => setSelectedDataGraphId(null)}
            />
          )}
        </div>
        
        <div className={`fixed right-0 top-0 h-full w-80 bg-white border-l shadow-xl transform transition-transform duration-300 z-50 ${showSettings ? 'translate-x-0' : 'translate-x-full'}`}>
          {showSettings && selectedGraph && (
            <GridContextProvider gridSize={gridSize}>
              <SettingsPanel 
                graph={selectedGraph} 
                onSettingsUpdate={handleSettingsUpdate}
                onClose={handleSettingsClose}
              />
            </GridContextProvider>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}