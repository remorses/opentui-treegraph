import { colord } from "colord";
import { scaleOrdinal } from "@visx/scale";
import { treemapBinary } from "@visx/hierarchy";
import type { HierarchyNode, HierarchyRectangularNode } from "d3-hierarchy";
import { treemap as d3treemap, hierarchy } from "d3-hierarchy";
import { useMemo, useState, createContext, useContext } from "react";
import { useTerminalDimensions, useKeyboard, render } from "@opentui/react";
import React from "react";

const margin = { top: 0, left: 0, right: 0, bottom: 0 };

const white = "#fff";
const black = "#444";

export interface TreeNode {
  name: string;
  value?: number;
  layer?: number;
  id?: number;
  deleted?: boolean;
  children?: TreeNode[];
}

interface TreemapContext {
  colorScale: (value: number) => string;
  deletedColorScale: (value: number) => string;
  selectedIndex: number;
  hoveredIndex: number;
  onNodeClick: (nodeId: number) => void;
  onNodeHover: (index: number) => void;
}

const context = createContext<TreemapContext>({
  colorScale: () => "",
  deletedColorScale: () => "",
  selectedIndex: 0,
  hoveredIndex: -1,
  onNodeClick: () => {},
  onNodeHover: () => {},
});

interface TreemapProps {
  data: TreeNode;
  colorScheme: string[];
  deletedColorScheme: string[];
  formatValue?: (value: number) => string;
}

const paddingTop = 3;
const paddingLeft = 1;

export function Treemap({
  data,
  colorScheme,
  deletedColorScheme,
  formatValue,
}: TreemapProps) {
  const { width, height } = useTerminalDimensions();

  const node = useMemo(() => {
    let i = 0;
    const hierarchyNode = hierarchy<TreeNode>(data)
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .sum((d) => d.value || 0)
      .each((x) => {
        i++;
        x.data.id = i;
      });
    return hierarchyNode;
  }, [data]);

  const [zoomedNodeId, setZoomedNodeId] = useState<number | undefined>(
    node.data.id,
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(-1);

  const zoomedNode = useMemo(() => {
    if (zoomedNodeId === node.data.id) {
      return node;
    }
    const found = node.descendants().find((n) => n.data.id === zoomedNodeId);
    return found || node;
  }, [node, zoomedNodeId]);

  const xMax = width - margin.left - margin.right - paddingLeft * 2;
  const yMax = height - margin.top - margin.bottom - paddingTop;

  const treemapElem = useMemo(() => {
    const treemap = d3treemap<TreeNode>()
      .tile(treemapBinary)
      .size([xMax, yMax])
      .padding(2)
      .paddingTop(1)
      .paddingBottom(1);

    return treemap(zoomedNode.copy());
  }, [zoomedNode, xMax, yMax]);

  const maxLayer = useMemo(() => {
    return Math.max(...node.descendants().map((n) => n.data.layer || 0));
  }, [node]);

  const step = Math.ceil(colorScheme.length / (maxLayer + 1));

  const colorScale = useMemo(
    () =>
      scaleOrdinal({
        domain: Array.from({ length: maxLayer + 1 }, (_l, i) => i),
        range: colorScheme.filter((_c, i) => i % step === 0),
      }),
    [maxLayer, step, colorScheme],
  );

  const deletedColorScale = useMemo(
    () =>
      scaleOrdinal({
        domain: Array.from({ length: maxLayer + 1 }, (_l, i) => i),
        range: deletedColorScheme.filter((_c, i) => i % step === 0),
      }),
    [maxLayer, step, deletedColorScheme],
  );

  const flatNodes = useMemo(() => treemapElem.descendants(), [treemapElem]);

  useKeyboard((key) => {
    if (key.name === "up") {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (key.name === "down") {
      setSelectedIndex((prev) => Math.min(flatNodes.length - 1, prev + 1));
    } else if (key.name === "return") {
      const selected = flatNodes[selectedIndex];
      if (selected && selected.children) {
        setZoomedNodeId(selected.data.id);
        setSelectedIndex(0);
      }
    } else if (key.name === "escape" || key.name === "backspace") {
      if (zoomedNode.parent) {
        setZoomedNodeId(zoomedNode.parent.data.id);
        setSelectedIndex(0);
      }
    }
  });

  if (!width || !height || width < 10) {
    return null;
  }

  const selectedNode = flatNodes[selectedIndex];
  const statusText = selectedNode
    ? `${selectedNode.data.name} - ${formatValue ? formatValue(selectedNode.value || 0) : selectedNode.value || 0} | ↑↓: Navigate | Enter: Zoom | Esc: Back`
    : "Use arrow keys to navigate";

  const handleNodeClick = (nodeId: number) => {
    const targetNode = node.descendants().find((n) => n.data.id === nodeId);
    if (targetNode && targetNode.children) {
      setZoomedNodeId(nodeId);
      setSelectedIndex(0);
    }
  };

  const handleNodeHover = (index: number) => {
    setHoveredIndex(index);
  };

  return (
    <box padding={1} paddingTop={0}>
      <context.Provider
        value={{
          colorScale,
          deletedColorScale,
          selectedIndex,
          hoveredIndex,
          onNodeClick: handleNodeClick,
          onNodeHover: handleNodeHover,
        }}
      >
        <box style={{ height: 3, border: true }}>
          <text>{statusText}</text>
        </box>

        <box style={{ flexDirection: "column", width, height }}>
          <box style={{ position: "relative", flexGrow: 1 }}>
            {flatNodes.map((node, i) => (
              <MapNode node={node} i={i} />
            ))}
          </box>
        </box>
      </context.Provider>
    </box>
  );
}

function MapNode({
  node,
  i,
}: {
  node: HierarchyRectangularNode<TreeNode>;
  i: number;
}) {
  const {
    colorScale,
    deletedColorScale,
    selectedIndex,
    hoveredIndex,
    onNodeClick,
    onNodeHover,
  } = useContext(context);
  const nodeWidth = Math.floor(node.x1 - node.x0);
  const nodeHeight = Math.floor(node.y1 - node.y0);
  const min = 2;

  const text = `${node.data.name}`;
  const showText = nodeWidth > 6 && nodeHeight > 1;

  function getBg(n: HierarchyRectangularNode<TreeNode> | null): string {
    if (!n) {
      return "transparent";
    }
    if (n.data.deleted) {
      return deletedColorScale(n.data.layer || 0) as string;
    }
    return colorScale(n.data.layer || 0) as string;
  }

  const backgroundColor = getBg(node);
  const isSelected = selectedIndex === i;
  const isHovered = hoveredIndex === i;

  const borderColor = useMemo(() => {
    if (isSelected) return "#ffffff";
    if (isHovered) {
      const color = colord(backgroundColor);
      return color.lighten(0.2).toHex();
    }
    return backgroundColor;
  }, [backgroundColor, isSelected, isHovered]);

  if (!nodeWidth || !nodeHeight || nodeWidth < min || nodeHeight < min) {
    return null;
  }

  return (
    <box
      title={showText ? text : undefined}
      style={{
        position: "absolute",
        top: Math.floor(node.y0) + margin.top + paddingTop,
        left: Math.floor(node.x0) + margin.left + paddingLeft,
        width: nodeWidth,
        height: nodeHeight,
        border: true,
        borderStyle: "single",
        borderColor,
      }}
      onMouse={(event) => {
        if (event.type === "down" && node.data.id !== undefined) {
          onNodeClick(node.data.id);
        } else if (event.type === "move" || event.type === "over") {
          onNodeHover(i);
        } else if (event.type === "out") {
          onNodeHover(-1);
        }
      }}
    />
  );
}

function nodeToPath(node: HierarchyNode<TreeNode>): string {
  const path: string[] = [];
  let current: HierarchyNode<TreeNode> | null = node;
  while (current) {
    path.push(current.data.name);
    current = current.parent;
  }
  return path.reverse().join("/");
}

// Custom error boundary class
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };

    // Bind methods
    this.componentDidCatch = this.componentDidCatch.bind(this);
  }

  static getDerivedStateFromError(error: Error): {
    hasError: boolean;
    error: Error;
  } {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Error caught by boundary:", error);
    console.error("Component stack:", errorInfo.componentStack);

    // Copy stack trace to clipboard
    const stackTrace = `${error.message}\n\nStack trace:\n${error.stack}\n\nComponent stack:\n${errorInfo.componentStack}`;
    const { execSync } = require("child_process");
    try {
      execSync("pbcopy", { input: stackTrace });
      console.log("Stack trace copied to clipboard");
    } catch (copyError) {
      console.error("Failed to copy to clipboard:", copyError);
    }
  }

  override render(): any {
    if (this.state.hasError && this.state.error) {
      return (
        <box style={{ flexDirection: "column", padding: 2 }}>
          <text fg="red">
            <strong>Error occurred:</strong>
          </text>
          <text>{this.state.error.message}</text>
          <text fg="brightBlack">Stack trace (copied to clipboard):</text>
          <text fg="white">{this.state.error.stack}</text>
        </box>
      );
    }

    return this.props.children;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + " KB";
  const mb = kb / 1024;
  if (mb < 1024) return mb.toFixed(1) + " MB";
  return (mb / 1024).toFixed(1) + " GB";
}

const demoData: TreeNode = {
  name: "root",
  value: 0,
  children: [
    {
      name: "src",
      value: 0,
      layer: 0,
      children: [
        { name: "index.ts", value: 1500, layer: 1 },
        { name: "utils.ts", value: 800, layer: 1 },
        { name: "components.tsx", value: 2400, layer: 1 },
      ],
    },
    {
      name: "node_modules",
      value: 0,
      layer: 0,
      children: [
        { name: "react", value: 5000, layer: 2 },
        { name: "lodash", value: 3200, layer: 2 },
        { name: "typescript", value: 8500, layer: 2 },
      ],
    },
    {
      name: "dist",
      value: 0,
      layer: 0,
      children: [
        { name: "bundle.js", value: 12000, layer: 3 },
        { name: "bundle.css", value: 400, layer: 3 },
      ],
    },
  ],
};

const schemeRed = [
  "#fee5d9",
  "#fcbba1",
  "#fc9272",
  "#fb6a4a",
  "#ef3b2c",
  "#cb181d",
  "#99000d",
];

function App() {
  return (
    <Treemap
      data={demoData}
      colorScheme={schemeRed}
      deletedColorScheme={schemeRed}
      formatValue={formatFileSize}
    />
  );
}

await render(
  React.createElement(ErrorBoundary, null, React.createElement(App)),
);
