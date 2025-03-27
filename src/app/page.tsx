'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import FileUploader from './components/FileUploader';
import DraggableGraph from './components/DraggableGraph';
import { parseCSVData, validateCSVFormat, ParsedData } from './utils/csvParser';
import SettingsPanel from './components/SettingsPanel';
import DataPanel from './components/DataPanel';

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
}

export default function Home() {
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);
  const [selectedDataGraphId, setSelectedDataGraphId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [zIndexCounter, setZIndexCounter] = useState(100);

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
      }
    };
    
    setGraphs([...graphs, newGraph]);
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

  // Function to remove a graph
  const handleRemoveGraph = (graphId: string) => {
    setGraphs((prevGraphs) => prevGraphs.filter(graph => graph.id !== graphId));
  };

  // 添加全局更新处理函数
  const handleGraphUpdate = (graphId: string, updatedProps: Partial<Graph>) => {
    setGraphs(prevGraphs => 
      prevGraphs.map(graph => {
        if (graph.id === graphId) {
          // Handle domains from data if provided
          let updatedGraph = { ...graph, ...updatedProps };
          
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
    if (selectedGraphId === id) setSelectedGraphId(null);
    if (selectedDataGraphId === id) setSelectedDataGraphId(null);
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

  const selectedGraph = graphs.find(graph => graph.id === selectedGraphId);
  const selectedDataGraph = graphs.find(graph => graph.id === selectedDataGraphId);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex flex-col p-4">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">CSV Graph Visualizer</h1>
          <p className="text-sm text-indigo-700 mt-1">Upload CSV files to visualize data as interactive scatter plots</p>
        </div>
        <div className="w-52">
          <FileUploader onDataParsed={handleFileProcessed} />
        </div>
      </header>
      
      <main className="flex-1 flex flex-col">
        <div className="bg-white rounded-lg shadow-xl flex-1 flex flex-col relative" style={{ minHeight: '85vh', overflow: 'visible' }}>
          {/* Graph Area */}
          <div className="flex-1 p-4 relative">
            <div className="relative w-full" style={{ height: '100%', minHeight: '500px' }}>
              {graphs.length > 0 ? (
                graphs.map((graph, index) => (
                  <DraggableGraph
                    key={graph.id}
                    data={graph.data}
                    filename={graph.filename || graph.title || 'Graph'}
                    position={graph.position}
                    size={graph.size}
                    rotation={graph.rotation}
                    zIndex={graph.zIndex || 100 + index}
                    onPositionChange={(x, y) => handlePositionUpdate(graph.id, x, y)}
                    onSizeChange={(width, height) => handleSizeUpdate(graph.id, width, height)}
                    onRotationChange={(rotation) => handleRotationUpdate(graph.id, rotation)}
                    color={graph.color}
                    onColorChange={(color) => handleColorChange(graph.id, color)}
                    onRemove={() => handleRemoveGraph(graph.id)}
                    isSettingsOpen={selectedGraphId === graph.id}
                    onToggleSettings={() => {
                      if (selectedGraphId === graph.id) {
                        setSelectedGraphId(null);
                        setShowSettings(false);
                      } else {
                        setSelectedGraphId(graph.id);
                        setShowSettings(true);
                        // Close data panel if different graph is selected for settings
                        if (selectedDataGraphId !== graph.id) {
                          setSelectedDataGraphId(null);
                        }
                        bringGraphToFront(graph.id);
                      }
                    }}
                    domains={graph.domains}
                    axisIntervals={graph.axisIntervals}
                    quadrantMode={graph.quadrantMode}
                    onDataPanelToggle={() => {
                      if (selectedDataGraphId === graph.id) {
                        setSelectedDataGraphId(null);
                      } else {
                        setSelectedDataGraphId(graph.id);
                        // Close settings panel if different graph is selected for data
                        if (selectedGraphId !== graph.id) {
                          setSelectedGraphId(null);
                        }
                        bringGraphToFront(graph.id);
                      }
                    }}
                  />
                ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="bg-indigo-50 p-6 rounded-full inline-block mb-4 shadow-sm">
                      <svg className="h-16 w-16 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-medium text-gray-900">No graphs yet</h3>
                    <p className="text-gray-600 mt-2 max-w-md mx-auto">Upload a CSV file to get started with interactive data visualization</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Data Panel - Left side slide in */}
        <div className={`fixed left-0 top-0 h-full w-80 bg-white border-r border-gray-200 shadow-2xl transform transition-transform duration-300 ease-in-out z-[1000] ${selectedDataGraphId ? 'translate-x-0' : '-translate-x-full'}`}>
          {selectedDataGraph && (
            <DataPanel 
              graph={selectedDataGraph}
              onDataUpdate={handleDataUpdate}
              onClose={() => setSelectedDataGraphId(null)}
            />
          )}
        </div>
        
        {/* Settings Panel - Right side slide in */}
        <div className={`fixed right-0 top-0 h-full w-80 bg-white shadow-lg transition-transform duration-300 transform z-[1000] ${showSettings ? 'translate-x-0' : 'translate-x-full'}`}>
          {showSettings && selectedGraph && (
            <SettingsPanel 
              graph={selectedGraph} 
              onSettingsUpdate={handleSettingsUpdate}
              onClose={handleSettingsClose}
            />
          )}
        </div>
      </main>
      
      <footer className="mt-6 text-center text-sm text-gray-600 py-3">
        <p>&copy; {new Date().getFullYear()} CSV Graph Visualizer</p>
      </footer>
    </div>
  );
}
