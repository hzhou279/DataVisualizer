'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import FileUploader from './components/FileUploader';
import DraggableGraph from './components/DraggableGraph';
import { parseCSVData, validateCSVFormat, ParsedData } from './utils/csvParser';
import SettingsPanel from './components/SettingsPanel';
import DataPanel from './components/DataPanel';
import GlobalCoordinateGrid from './components/GlobalCoordinateGrid';

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

  const handleFileProcessed = (parsedData: ParsedData[], fileName: string) => {
    if (parsedData.length === 0) {
      alert('No valid data points found in the file.');
      return;
    }

    // Extract the metadata from the first point (added by parseCSVData)
    const firstPoint = parsedData[0];
    const quadrantMode = firstPoint.quadrantMode || 'first';
    const domains = firstPoint.domains || {
      xMin: 0,
      xMax: 100,
      yMin: 0,
      yMax: 100
    };
    
    // Increment the z-index counter for each new graph
    setZIndexCounter(prev => prev + 1);
    
    // Use fixed reasonable sizes
    const initialWidth = 500;
    const initialHeight = 400;
    
    // Create a new Graph object
    const newGraph: Graph = {
      id: Date.now().toString(),
      title: fileName || 'Graph',
      data: parsedData,
      position: getNextGraphPosition(graphs),
      size: { width: initialWidth, height: initialHeight },
      rotation: 0,
      color: '#3b82f6',
      axisIntervals: { x: 5, y: 5 },
      quadrantMode: quadrantMode as QuadrantMode,
      domains,
      zIndex: zIndexCounter,
      minimized: false,
      settings: {
        showGrid: true,
        dotSize: 5,
        showLabels: true
      },
      globalCoordinate: { x: 0, y: 0 },
      rotationCenter: { x: 0, y: 0 }
    };
    
    setGraphs(prevGraphs => [...prevGraphs, newGraph]);
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
    console.log(`Rotating graph ${graphId} to ${rotation}°`);
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

  // 添加全局更新处理函数
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
            
            // Calculate position delta based on global coordinate change
            const deltaX = newGlobal.x - currentGlobal.x;
            const deltaY = newGlobal.y - currentGlobal.y;
            
            // Update position to maintain the same visual position with new global coordinates
            updatedGraph.position = {
              x: graph.position.x + deltaX,
              y: graph.position.y + deltaY
            };
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
    
    setGraphs(graphs.map(graph => {
      if (graph.id === selectedGraphId) {
        return { ...graph, ...settings };
      }
      return graph;
    }));
    
    // Reset selected graph ID after applying settings
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

  const selectedGraph = graphs.find(graph => graph.id === selectedGraphId);
  const selectedDataGraph = graphs.find(graph => graph.id === selectedDataGraphId);

  return (
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
            {showGrid && <GlobalCoordinateGrid gridSize={50} showLabels={true} />}
          </div>

          {/* Graphs container */}
          <div className="relative h-full" style={{ zIndex: 2 }}>
            {graphs.length > 0 ? (
              graphs.map((graph) => (
                <DraggableGraph
                  key={graph.id}
                  {...graph}
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
          <SettingsPanel 
            graph={selectedGraph} 
            onSettingsUpdate={handleSettingsUpdate}
            onClose={handleSettingsClose}
          />
        )}
      </div>
    </div>
  );
}