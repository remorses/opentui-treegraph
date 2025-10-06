import { colord } from "colord";
import { scaleOrdinal, scaleSqrt } from "@visx/scale";
import { treemapBinary } from "@visx/hierarchy";
import type { HierarchyNode, HierarchyRectangularNode } from "d3-hierarchy";
import { treemap as d3treemap, hierarchy } from "d3-hierarchy";
import { useMemo, useState, createContext, useContext } from "react";
import { useTerminalDimensions, useKeyboard, render } from "@opentui/react";
import React from "react";

const margin = { top: 0, left: 0, right: 0, bottom: 0 };

const scheme = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
];

const schemeRed = [
  "#fee5d9",
  "#fcbba1",
  "#fc9272",
  "#fb6a4a",
  "#ef3b2c",
  "#cb181d",
  "#99000d",
];

const white = "#fff";
const black = "#444";

interface TreeNode {
  name: string;
  value?: number;
  layer?: number;
  id?: number;
  deleted?: boolean;
  children?: TreeNode[];
}

interface Layer {
  command: string;
}

interface TreemapContext {
  zoomedNode: HierarchyNode<TreeNode>;
  setZoomedNode: (node: HierarchyNode<TreeNode>) => void;
  colorScale: (value: number) => string;
  deletedColorScale: (value: number) => string;
  layers: Layer[];
  fontScale: (value: number) => number;
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
}

const context = createContext<TreemapContext>({
  zoomedNode: {} as HierarchyNode<TreeNode>,
  setZoomedNode: () => {},
  colorScale: () => "",
  deletedColorScale: () => "",
  layers: [],
  fontScale: () => 0,
  selectedIndex: 0,
  setSelectedIndex: () => {},
});

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

export function TreemapDemo() {
  const { width, height } = useTerminalDimensions();

  const layers = useMemo(
    () => [
      { command: "layer 0" },
      { command: "layer 1" },
      { command: "layer 2" },
      { command: "layer 3" },
    ],
    [],
  );

  const node = useMemo(() => {
    let i = 0;
    const hierarchyNode = hierarchy<TreeNode>(demoData)
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .sum((d) => d.value || 0)
      .each((x) => {
        i++;
        x.data.id = i;
      });
    return hierarchyNode;
  }, []);

  const [zoomedNode, setZoomedNode] = useState(node);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const xMax = width - margin.left - margin.right - 2;
  const yMax = height - margin.top - margin.bottom - 2;

  const fontScale = useMemo(() => {
    const nodes = node.descendants().map((x) => x.value || 0);
    return scaleSqrt<number>()
      .domain([Math.min(...nodes), Math.max(...nodes)])
      .range([1, 3]);
  }, [node]);

  const treemapElem = useMemo(() => {
    const treemap = d3treemap<TreeNode>()
      .tile(treemapBinary)
      .size([xMax, yMax])
      .padding(1)
      .paddingTop((x) => fontScale(x.value || 0) + 1);

    return treemap(zoomedNode);
  }, [zoomedNode, xMax, yMax, fontScale]);

  const step = Math.ceil(scheme.length / layers.length);

  const colorScale = useMemo(
    () =>
      scaleOrdinal({
        domain: layers.map((_l, i) => i),
        range: schemeRed.filter((_c, i) => i % step === 0),
      }),
    [layers.length, step],
  );

  const deletedColorScale = useMemo(
    () =>
      scaleOrdinal({
        domain: layers.map((_l, i) => i),
        range: schemeRed.filter((_c, i) => i % step === 0),
      }),
    [layers.length, step],
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
        setZoomedNode(selected);
        setSelectedIndex(0);
      }
    } else if (key.name === "escape" || key.name === "backspace") {
      if (zoomedNode.parent) {
        setZoomedNode(zoomedNode.parent);
        setSelectedIndex(0);
      }
    }
  });

  if (!width || !height || width < 10) {
    return null;
  }

  return (
    <context.Provider
      value={{
        zoomedNode,
        layers,
        setZoomedNode,
        colorScale,
        deletedColorScale,
        fontScale,
        selectedIndex,
        setSelectedIndex,
      }}
    >
      <box style={{ flexDirection: "column", width, height }}>
        <box style={{ position: "relative", flexGrow: 1 }}>
          {flatNodes.map((node, i) => (
            <MapNode node={node} i={i} />
          ))}
        </box>
        <box style={{ height: 3, border: true, padding: 0 }}>
          <text>
            {selectedIndex < flatNodes.length && flatNodes[selectedIndex]
              ? `${flatNodes[selectedIndex]!.data.name} - ${formatFileSize(flatNodes[selectedIndex]!.value || 0)} | ↑↓: Navigate | Enter: Zoom | Esc: Back`
              : "Use arrow keys to navigate"}
          </text>
        </box>
      </box>
    </context.Provider>
  );
}

function MapNode({
  node,
  i,
}: {
  node: HierarchyRectangularNode<TreeNode>;
  i: number;
}) {
  const { colorScale, deletedColorScale, selectedIndex } = useContext(context);
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

  const textColor = useMemo(() => {
    const color = colord(backgroundColor);
    if (color.isLight()) {
      return black;
    }
    return white;
  }, [backgroundColor]);

  if (!nodeWidth || !nodeHeight || nodeWidth < min || nodeHeight < min) {
    return null;
  }

  return (
    <box
      style={{
        position: "absolute",
        top: Math.floor(node.y0) + margin.top,
        left: Math.floor(node.x0) + margin.left,
        width: nodeWidth,
        height: nodeHeight,
        backgroundColor: isSelected ? "#ffffff" : backgroundColor,
      }}
    >
      {showText && (
        <text
          style={{
            fg: isSelected ? black : textColor,
          }}
        >
          {text.slice(0, nodeWidth - 2)}
        </text>
      )}
    </box>
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

function App() {
  return <TreemapDemo />;
}

await render(
  React.createElement(ErrorBoundary, null, React.createElement(App)),
);
