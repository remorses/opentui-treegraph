
import { render } from "@opentui/react";

import * as React from "react";

function App() {
  return (
    <box style={{ flexDirection: "column", height: "100%", padding: 1 }}>

    </box>
  );
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


await render(
  React.createElement(ErrorBoundary, null, React.createElement(App)),
);
