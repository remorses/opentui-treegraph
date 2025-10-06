import { render } from "@opentui/react";
import React from "react";
import { Treemap, type TreeNode } from "./src/index";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };

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
      nodes={[
        { name: "default", data: demoData }, //
        { name: "another", data: demoData }, //
      ]}
      colorScheme={schemeRed}
      deletedColorScheme={schemeRed}
      formatValue={formatFileSize}
    />
  );
}

await render(
  React.createElement(ErrorBoundary, null, React.createElement(App)),
);
