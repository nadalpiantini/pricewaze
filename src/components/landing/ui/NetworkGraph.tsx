'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Node {
  id: string;
  x: number;
  y: number;
  size: number;
  pulseDelay: number;
  color: 'cyan' | 'lime' | 'teal';
}

interface Edge {
  from: string;
  to: string;
  animated: boolean;
}

interface NetworkGraphProps {
  nodeCount?: number;
  className?: string;
  interactive?: boolean;
}

function generateNodes(count: number, width: number, height: number): Node[] {
  const nodes: Node[] = [];
  const colors: ('cyan' | 'lime' | 'teal')[] = ['cyan', 'lime', 'teal'];

  // Generate nodes with some randomness but avoiding edges
  const padding = 50;
  const gridSize = Math.ceil(Math.sqrt(count));
  const cellWidth = (width - padding * 2) / gridSize;
  const cellHeight = (height - padding * 2) / gridSize;

  for (let i = 0; i < count; i++) {
    const gridX = i % gridSize;
    const gridY = Math.floor(i / gridSize);

    // Add randomness within each cell
    const jitterX = (Math.random() - 0.5) * cellWidth * 0.6;
    const jitterY = (Math.random() - 0.5) * cellHeight * 0.6;

    nodes.push({
      id: `node-${i}`,
      x: padding + gridX * cellWidth + cellWidth / 2 + jitterX,
      y: padding + gridY * cellHeight + cellHeight / 2 + jitterY,
      size: 4 + Math.random() * 4,
      pulseDelay: Math.random() * 2000,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  return nodes;
}

function generateEdges(nodes: Node[], connectionProbability: number = 0.3): Edge[] {
  const edges: Edge[] = [];
  const maxDistance = 150; // Only connect nearby nodes

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < maxDistance && Math.random() < connectionProbability) {
        edges.push({
          from: nodes[i].id,
          to: nodes[j].id,
          animated: Math.random() > 0.5,
        });
      }
    }
  }

  return edges;
}

export function NetworkGraph({
  nodeCount = 20,
  className,
  interactive = true,
}: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Set up dimensions and generate graph
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });

        const newNodes = generateNodes(nodeCount, width, height);
        setNodes(newNodes);
        setEdges(generateEdges(newNodes));
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [nodeCount]);

  const getNodeColor = (node: Node) => {
    switch (node.color) {
      case 'cyan':
        return 'var(--signal-cyan)';
      case 'lime':
        return 'var(--signal-lime)';
      case 'teal':
        return 'var(--signal-teal)';
    }
  };

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div
      ref={containerRef}
      className={cn('absolute inset-0 overflow-hidden', className)}
    >
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0"
      >
        <defs>
          <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--signal-cyan)" stopOpacity="0.3" />
            <stop offset="50%" stopColor="var(--signal-teal)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--signal-lime)" stopOpacity="0.3" />
          </linearGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        <g className="edges">
          {edges.map((edge, i) => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            if (!fromNode || !toNode) return null;

            const isHighlighted =
              hoveredNode === edge.from || hoveredNode === edge.to;

            return (
              <line
                key={`edge-${i}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="url(#edge-gradient)"
                strokeWidth={isHighlighted ? 2 : 1}
                opacity={isHighlighted ? 0.8 : 0.3}
                className={cn(
                  'transition-all duration-300',
                  edge.animated && 'animate-pulse'
                )}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g className="nodes">
          {nodes.map((node) => {
            const isHovered = hoveredNode === node.id;
            const isConnected =
              hoveredNode &&
              edges.some(
                (e) =>
                  (e.from === hoveredNode && e.to === node.id) ||
                  (e.to === hoveredNode && e.from === node.id)
              );

            return (
              <g
                key={node.id}
                className={cn(
                  'transition-all duration-300',
                  interactive && 'cursor-pointer'
                )}
                onMouseEnter={() => interactive && setHoveredNode(node.id)}
                onMouseLeave={() => interactive && setHoveredNode(null)}
              >
                {/* Pulse ring */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size * 2}
                  fill={getNodeColor(node)}
                  opacity={0}
                  className="animate-signal-pulse"
                  style={{ animationDelay: `${node.pulseDelay}ms` }}
                />

                {/* Main node */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isHovered ? node.size * 1.5 : node.size}
                  fill={getNodeColor(node)}
                  filter={isHovered || isConnected ? 'url(#glow)' : undefined}
                  opacity={isHovered || isConnected ? 1 : 0.8}
                  className="transition-all duration-200"
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

interface DataFlowProps {
  className?: string;
}

export function DataFlowLines({ className }: DataFlowProps) {
  return (
    <svg
      className={cn('absolute inset-0 pointer-events-none', className)}
      width="100%"
      height="100%"
    >
      <defs>
        <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--signal-cyan)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--signal-cyan)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="var(--signal-lime)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Animated flow lines */}
      {[0, 1, 2].map((i) => (
        <line
          key={i}
          x1="10%"
          y1={`${30 + i * 20}%`}
          x2="90%"
          y2={`${30 + i * 20}%`}
          stroke="url(#flow-gradient)"
          strokeWidth="2"
          strokeDasharray="20 40"
          className="animate-pulse"
          style={{ animationDelay: `${i * 500}ms` }}
        />
      ))}
    </svg>
  );
}
