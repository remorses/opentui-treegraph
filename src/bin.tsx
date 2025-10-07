#!/usr/bin/env bun --install=fallback
import { render } from "@opentui/react";
import React from "react";
import { Treemap, type TreeNode, type TreeNodeData } from "./treeview";
import fs from "fs";
import path from "path";
import { glob } from "glob";

interface DependencyEdge {
  source: string;
  target: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + " KB";
  const mb = kb / 1024;
  if (mb < 1024) return mb.toFixed(1) + " MB";
  return (mb / 1024).toFixed(1) + " GB";
}

function buildTreeFromDependencies(deps: DependencyEdge[]): TreeNode {
  const nodeMap = new Map<string, TreeNode>();
  const childrenMap = new Map<string, Set<string>>();

  for (const dep of deps) {
    if (!nodeMap.has(dep.source)) {
      nodeMap.set(dep.source, {
        name: path.basename(dep.source),
        value: 1,
        layer: 0,
        children: [],
      });
    }

    if (!nodeMap.has(dep.target)) {
      nodeMap.set(dep.target, {
        name: path.basename(dep.target),
        value: 1,
        layer: 1,
        children: [],
      });
    }

    if (!childrenMap.has(dep.source)) {
      childrenMap.set(dep.source, new Set());
    }
    childrenMap.get(dep.source)!.add(dep.target);
  }

  const roots = new Set<string>();
  const allTargets = new Set<string>();

  for (const dep of deps) {
    allTargets.add(dep.target);
  }

  for (const dep of deps) {
    if (!allTargets.has(dep.source)) {
      roots.add(dep.source);
    }
  }

  if (roots.size === 0 && nodeMap.size > 0) {
    roots.add(deps[0]!.source);
  }

  const rootChildren: TreeNode[] = [];

  for (const id of nodeMap.keys()) {
    const children = childrenMap.get(id);
    if (children) {
      const node = nodeMap.get(id)!;
      node.children = Array.from(children).map(
        (childId) => nodeMap.get(childId)!,
      );
    }

    if (roots.has(id)) {
      rootChildren.push(nodeMap.get(id)!);
    }
  }

  return {
    name: "root",
    value: 0,
    layer: 0,
    children:
      rootChildren.length > 0 ? rootChildren : Array.from(nodeMap.values()),
  };
}

async function findGraphFiles(): Promise<string[]> {
  const files = await glob("*-treeview.json", {
    ignore: ["node_modules/**", ".git/**"],
    absolute: true,
  });

  if (files.length === 0) {
    console.error("No treeview-*.json graph files found in dist directory.");
    process.exit(1);
  }

  return files;
}

const schemeRed = [
  "#fee5d9",
  "#fcbba1",
  "#fc9272",
  "#fb6a4a",
  "#ef3b2c",
  "#cb181d",
  "#99000d",
];

async function main() {
  const graphFiles = await findGraphFiles();

  const nodes: TreeNodeData[] = [];

  for (const file of graphFiles) {
    const content = fs.readFileSync(file, "utf-8");
    const deps: DependencyEdge[] = JSON.parse(content);

    const tree = buildTreeFromDependencies(deps);
    const filename = path.basename(file, ".json");
    const envName = filename.replace(/^treeview-/, "");

    nodes.push({
      name: envName,
      data: tree,
    });
  }

  function App() {
    return (
      <Treemap
        nodes={nodes}
        colorScheme={schemeRed}
        deletedColorScheme={schemeRed}
        formatValue={formatFileSize}
      />
    );
  }

  await render(React.createElement(App));
}

main();
