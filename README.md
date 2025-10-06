# opentui-treegraph

Interactive treemap visualization for the terminal using [OpenTUI](https://github.com/sst/opentui).

![Screenshot](Screenshot%202025-10-06%20at%2014.16.01.png)

## Features

- 🎨 Interactive treemap visualization with hierarchical data
- 🖱️ Mouse support for clicking and hovering nodes
- ⌨️ Keyboard navigation (arrow keys, Enter to zoom, Esc to go back)
- 🎯 Customizable color schemes
- 📊 Value formatting support

## Installation

```bash
bun install
```

## Usage

Run the demo:

```bash
bun run src/treeview.tsx
```

## Component API

```tsx
import { Treemap } from "./src/treeview";

<Treemap
  data={treeData}
  colorScheme={["#fee5d9", "#fc9272", "#ef3b2c"]}
  deletedColorScheme={["#fee5d9", "#fc9272", "#ef3b2c"]}
  formatValue={(value) => `${value} KB`}
/>
```

### Props

- `data`: Tree node with hierarchical structure
- `colorScheme`: Array of hex colors for node borders
- `deletedColorScheme`: Array of hex colors for deleted nodes
- `formatValue`: Optional function to format node values

## Controls

- **Arrow Keys**: Navigate between nodes
- **Enter**: Zoom into selected node
- **Escape/Backspace**: Zoom out to parent node
- **Mouse Click**: Zoom into clicked node
- **Mouse Hover**: Highlight node

Built with [Bun](https://bun.sh) and [OpenTUI](https://github.com/sst/opentui).
