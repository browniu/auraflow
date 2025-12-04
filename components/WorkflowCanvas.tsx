import React, { useRef, useState, useEffect } from 'react';
import { Module, WorkflowNode, WorkflowEdge, ExecutionState } from '../types';
import { getColorForString, ICONS } from '../constants';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  modules: Module[];
  onNodeAdd: (moduleId: string, x: number, y: number) => void;
  onNodeMove: (id: string, x: number, y: number) => void;
  onEdgeAdd: (source: string, target: string) => void;
  onNodeSelect: (id: string | null) => void;
  selectedNodeId: string | null;
  executionState: ExecutionState;
  onOpenApp: (nodeId: string) => void;
  onContinueExecution: (nodeId: string) => void;
  onStopExecution: () => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  edges,
  modules,
  onNodeAdd,
  onNodeMove,
  onEdgeAdd,
  onNodeSelect,
  selectedNodeId,
  executionState,
  onOpenApp,
  onContinueExecution,
  onStopExecution
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [linkingSource, setLinkingSource] = useState<{ nodeId: string, x: number, y: number, color: string } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Dragging state
  const [draggingNode, setDraggingNode] = useState<{ id: string, startX: number, startY: number, initialNodeX: number, initialNodeY: number } | null>(null);

  // Auto-execution for Trigger Nodes
  useEffect(() => {
    if (executionState.isRunning && executionState.activeNodeId) {
      const node = nodes.find(n => n.id === executionState.activeNodeId);
      if (node) {
        const mod = modules.find(m => m.id === node.moduleId);
        if (mod?.type === 'trigger') {
          // Visual delay for UX, then auto-continue without user confirmation
          const timer = setTimeout(() => {
            onContinueExecution(node.id);
          }, 1000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [executionState.isRunning, executionState.activeNodeId, nodes, modules, onContinueExecution]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePos({ x, y });

      if (draggingNode) {
        onNodeMove(draggingNode.id, draggingNode.initialNodeX + (e.clientX - draggingNode.startX), draggingNode.initialNodeY + (e.clientY - draggingNode.startY));
      }
    };

    const handleMouseUp = () => {
      setDraggingNode(null);
      setLinkingSource(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNode, onNodeMove]);

  const getModule = (id: string) => modules.find(m => m.id === id);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const moduleId = e.dataTransfer.getData('moduleId');
    if (moduleId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      onNodeAdd(moduleId, e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  // Constants for Node Dimensions
  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 100;
  const HEADER_HEIGHT = 32;

  // Background Click Handler - Clears selection
  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on the SVG/Background
    if (e.target === svgRef.current) {
      onNodeSelect(null);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-[#F5F4EF] relative overflow-hidden grid-bg"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
       {/* Background Grid Pattern */}
       <div className="absolute inset-0 pointer-events-none opacity-10" 
         style={{ backgroundImage: 'radial-gradient(#C5A059 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
       </div>

      <svg 
        ref={svgRef} 
        width="100%" 
        height="100%"
        onMouseDown={handleBackgroundMouseDown}
      >
        <defs>
           <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
             <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
             <feMerge>
               <feMergeNode in="coloredBlur"/>
               <feMergeNode in="SourceGraphic"/>
             </feMerge>
           </filter>
        </defs>

        {/* Edges */}
        {edges.map(edge => {
          const source = nodes.find(n => n.id === edge.source);
          const target = nodes.find(n => n.id === edge.target);
          if (!source || !target) return null;

          const sourceMod = getModule(source.moduleId);
          const edgeColor = sourceMod?.color || getColorForString(source.moduleId);

          // Calculate connection points (Source Right, Target Left)
          const sourceX = source.x + NODE_WIDTH;
          const sourceY = source.y + HEADER_HEIGHT + (NODE_HEIGHT - HEADER_HEIGHT) / 2;
          const targetX = target.x;
          const targetY = target.y + HEADER_HEIGHT + (NODE_HEIGHT - HEADER_HEIGHT) / 2;

          // Smart Bezier curve
          const distX = targetX - sourceX;
          const distY = targetY - sourceY;
          
          let c1x, c1y, c2x, c2y;
          
          if (distX > 0) {
             // Standard Forward
             const curvature = Math.max(distX * 0.5, 60);
             c1x = sourceX + curvature;
             c1y = sourceY;
             c2x = targetX - curvature;
             c2y = targetY;
          } else {
             // Backward Loop
             const curvature = Math.max(Math.abs(distX) * 0.5, 120);
             const verticalOffset = distY > 0 ? -50 : 50; 
             c1x = sourceX + 60;
             c1y = sourceY + (Math.abs(distY) < 50 ? verticalOffset : 0);
             c2x = targetX - 60;
             c2y = targetY + (Math.abs(distY) < 50 ? verticalOffset : 0);
          }

          const path = `M ${sourceX} ${sourceY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${targetX} ${targetY}`;

          return (
            <g key={edge.id}>
              <path
                d={path}
                stroke={edgeColor}
                strokeWidth="2.5"
                fill="none"
                strokeDasharray="5,5"
                className="transition-all hover:stroke-width-4 cursor-pointer"
              />
              <circle 
                cx={targetX} 
                cy={targetY} 
                r="4" 
                fill="#F5F4EF" 
                stroke={edgeColor} 
                strokeWidth="2.5" 
              />
            </g>
          );
        })}

        {/* Creating Link Line */}
        {linkingSource && (
          <path
            d={`M ${linkingSource.x} ${linkingSource.y} C ${linkingSource.x + 50} ${linkingSource.y}, ${mousePos.x - 50} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
            stroke={linkingSource.color}
            strokeWidth="2"
            strokeDasharray="5,5"
            fill="none"
            className="opacity-60 pointer-events-none"
          />
        )}

        {/* Nodes */}
        {nodes.map(node => {
          const mod = getModule(node.moduleId);
          const isSelected = selectedNodeId === node.id;
          const isActive = executionState.activeNodeId === node.id;
          const nodeColor = mod?.color || getColorForString(node.moduleId);
          
          return (
            <g 
              key={node.id} 
              transform={`translate(${node.x},${node.y})`}
              onClick={(e) => e.stopPropagation()} 
            >
              {/* Active Glow Effect */}
              {isActive && (
                <rect
                  x="-4" y="-4"
                  width={NODE_WIDTH + 8}
                  height={NODE_HEIGHT + 8}
                  rx="12"
                  fill="none"
                  stroke={nodeColor}
                  strokeWidth="4"
                  className="animate-pulse opacity-50"
                  filter="url(#glow)"
                />
              )}

              {/* Node Body */}
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx="8"
                fill="#FFFFFF"
                stroke={isActive ? nodeColor : (isSelected ? nodeColor : "#E5E7EB")}
                strokeWidth={isActive || isSelected ? "2" : "1"}
                className={`shadow-lg transition-all ${isSelected ? 'filter drop-shadow-md' : ''}`}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onNodeSelect(node.id);
                  if (!executionState.isRunning) {
                    setDraggingNode({ 
                      id: node.id, 
                      startX: e.clientX, 
                      startY: e.clientY, 
                      initialNodeX: node.x, 
                      initialNodeY: node.y 
                    });
                  }
                }}
              />

              {/* Header */}
              <path 
                 d={`M 0 8 Q 0 0 8 0 L ${NODE_WIDTH - 8} 0 Q ${NODE_WIDTH} 0 ${NODE_WIDTH} 8 L ${NODE_WIDTH} ${HEADER_HEIGHT} L 0 ${HEADER_HEIGHT} Z`} 
                 fill={nodeColor}
                 fillOpacity={isSelected || isActive ? 1 : 0.1}
                 className="pointer-events-none transition-colors duration-200"
               />

              {/* Title */}
              <text
                x="12"
                y="21"
                className={`text-xs font-bold pointer-events-none select-none ${isSelected || isActive ? 'fill-white' : 'fill-gray-700'}`}
              >
                {node.label || mod?.name || '未知模组'}
              </text>

              {/* Content Preview */}
              <foreignObject x="12" y={HEADER_HEIGHT + 10} width={NODE_WIDTH - 24} height={NODE_HEIGHT - HEADER_HEIGHT - 20}>
                  <div className="flex flex-col h-full pointer-events-none select-none">
                     <span className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: nodeColor }}>
                        {mod?.type === 'trigger' ? '初始参数' : node.id.slice(-6).toUpperCase()}
                     </span>
                     <div className="text-[11px] text-gray-500 overflow-hidden leading-tight" style={{ maxHeight: '44px' }}>
                        {mod?.type === 'trigger' ? (
                            node.inputData && Object.keys(node.inputData).length > 0 
                                ? (
                                  <div className="flex flex-col gap-0.5">
                                    {Object.entries(node.inputData).map(([k, v]) => (
                                      <div key={k} className="truncate flex items-center gap-1">
                                        <span className="font-semibold opacity-60 text-[10px]">{k}:</span>
                                        <span>{v}</span>
                                      </div>
                                    ))}
                                  </div>
                                )
                                : <span className="italic opacity-50">无参数</span>
                        ) : (
                            node.customPrompt 
                                ? `"${node.customPrompt}"` 
                                : (mod?.targetUrl ? new URL(mod.targetUrl).hostname : '')
                        )}
                     </div>
                  </div>
              </foreignObject>

              {/* EXECUTION OVERLAY - Action Buttons */}
              {isActive && mod?.type !== 'trigger' && (
                <foreignObject x="0" y={NODE_HEIGHT + 10} width={NODE_WIDTH} height="80">
                   <div className="flex flex-col gap-2 p-2 bg-white/90 backdrop-blur rounded-lg border border-gray-200 shadow-xl animate-fade-in-up">
                      <div className="text-xs font-bold text-center text-gray-700">
                         需人工操作
                      </div>
                      <div className="flex gap-2 justify-center">
                        <button 
                           onClick={() => onOpenApp(node.id)}
                           className="bg-brand-gold hover:bg-brand-dark text-white text-xs px-3 py-1.5 rounded shadow-sm flex items-center gap-1 transition-colors"
                        >
                           <ICONS.Play className="w-3 h-3" />
                           打开应用
                        </button>
                         <button 
                           onClick={() => onContinueExecution(node.id)}
                           className="bg-white hover:bg-gray-50 text-gray-700 text-xs px-3 py-1.5 rounded shadow-sm border border-gray-200 transition-colors"
                        >
                           下一步
                        </button>
                        <button 
                           onClick={onStopExecution}
                           className="bg-red-50 text-red-500 hover:bg-red-100 text-xs px-3 py-1.5 rounded shadow-sm border border-red-100 transition-colors"
                        >
                           停止
                        </button>
                      </div>
                   </div>
                </foreignObject>
              )}

              {/* Ports */}
              {mod?.type !== 'trigger' && (
                <g 
                   transform={`translate(0, ${HEADER_HEIGHT + (NODE_HEIGHT - HEADER_HEIGHT) / 2})`}
                   onMouseUp={(e) => {
                    e.stopPropagation();
                    if (linkingSource && linkingSource.nodeId !== node.id) {
                      onEdgeAdd(linkingSource.nodeId, node.id);
                      setLinkingSource(null);
                    }
                  }}
                >
                  <circle r="12" fill="transparent" className="cursor-pointer" />
                  <circle
                    r="4"
                    fill="#FFFFFF"
                    stroke={nodeColor}
                    strokeWidth="2"
                    className="transition-transform hover:scale-125"
                  />
                </g>
              )}

              <g 
                transform={`translate(${NODE_WIDTH}, ${HEADER_HEIGHT + (NODE_HEIGHT - HEADER_HEIGHT) / 2})`}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  // Disable linking during execution
                  if (executionState.isRunning) return;
                  
                  setLinkingSource({ 
                    nodeId: node.id, 
                    x: node.x + NODE_WIDTH, 
                    y: node.y + HEADER_HEIGHT + (NODE_HEIGHT - HEADER_HEIGHT) / 2,
                    color: nodeColor
                  });
                }}
              >
                 <circle r="12" fill="transparent" className="cursor-crosshair" />
                 <circle
                  r="4"
                  fill={nodeColor}
                  stroke="white"
                  strokeWidth="2"
                  className="transition-transform hover:scale-125"
                />
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};