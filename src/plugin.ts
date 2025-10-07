import type { Plugin } from "vite";
import fs from "fs";
import path from "path";

interface DependencyEdge {
  source: string;
  target: string;
}

export function treegraphPlugin(): Plugin {
  let isFirstEnvironment = true;

  return {
    name: "vite-treegraph",
    enforce: "post",

    buildEnd() {
      const deps: DependencyEdge[] = [];
      for (const id of this.getModuleIds()) {
        const m = this.getModuleInfo(id);
        if (m != null && !m.isExternal) {
          for (const target of m.importedIds) {
            deps.push({ source: m.id, target });
          }
        }
      }

      const environmentName = this.environment?.name || "default";
      const outputPath = path.join(
        this.environment.config.build.outDir,
        `${environmentName}-treeview.json`,
      );

      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, JSON.stringify(deps, null, 2));

      console.log(
        `[vite-treegraph] Generated graph for ${environmentName} environment at ${outputPath}`,
      );

      if (isFirstEnvironment) {
        console.log(
          `[vite-treegraph] Run 'bun vite-treegraph' to visualize the dependency tree`,
        );
        isFirstEnvironment = false;
      }
    },
  };
}
