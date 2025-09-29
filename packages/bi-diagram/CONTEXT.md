# BI-Diagram Package Context

## Overview

The `@wso2/bi-diagram` package is a React-based flow diagram renderer specifically designed for visualizing Ballerina code blocks (functions, resource functions, and other code constructs). It leverages the `@projectstorm/react-diagrams` library to create interactive, visual flow diagrams that represent the execution flow of Ballerina code.

## Architecture

### Core Pattern: Visitor Pattern
The package uses the **Visitor Pattern** extensively to process flow data and transform it into renderable diagram models. The main workflow involves:

1. **Data Processing**: Multiple visitors traverse the flow data to calculate positions, sizes, and relationships
2. **Model Creation**: Visitors create node models that conform to react-diagrams API
3. **Rendering**: React components render the models using react-diagrams engine

### Key Dependencies
- `@projectstorm/react-diagrams` (v7.x) - Core diagramming library
- `@wso2/ballerina-core` - Provides core types and utilities for Ballerina AST
- `@wso2/ui-toolkit` - Shared UI components
- `lodash` - Utility functions
- `React 18.2.0`

## Main Components

### 1. Diagram Component (`src/components/Diagram.tsx`)
**Purpose**: Main orchestrating component that initializes the diagram engine and manages the overall diagram state.

**Key Features**:
- Manages diagram engine lifecycle
- Handles breakpoint integration
- Supports error flow visualization
- Provides callback mechanisms for node interactions
- Manages diagram zoom and positioning

**Key Methods**:
- `getDiagramData()` - Orchestrates visitor execution to process flow data
- `drawDiagram()` - Creates and renders the diagram model
- `getErrorHandlerIdForActiveBreakpoint()` - Handles breakpoint-based error handler expansion

### 2. Visitors (`src/visitors/`)
**Purpose**: Implement the visitor pattern to process flow data and prepare it for rendering.

#### Core Visitors:
- **`InitVisitor`**: Initializes node view states and handles error handler expansion
- **`SizingVisitor`**: Calculates dimensions for all nodes based on content and type
- **`PositionVisitor`**: Determines x,y coordinates for optimal diagram layout
- **`NodeFactoryVisitor`**: Creates react-diagram node models from flow data
- **`LinkTargetVisitor`**: Establishes connections between nodes
- **`BreakpointVisitor`**: Applies breakpoint information to nodes

#### Utility Visitors:
- **`AddNodeVisitor`**: Handles adding new nodes to the flow
- **`RemoveNodeVisitor`**: Manages node removal
- **`RemoveEmptyNodesVisitor`**: Cleans up empty nodes from the flow

### 3. Node Types (`src/components/nodes/`)
Each node type consists of three files following react-diagrams pattern:
- `*NodeModel.ts` - Data model extending react-diagrams NodeModel
- `*NodeWidget.tsx` - React component for rendering
- `*NodeFactory.tsx` - Factory for creating instances

#### Available Node Types:
- **`BaseNode`**: Standard statement/action nodes
- **`IfNode`**: Conditional branching with multiple branches
- **`WhileNode`**: Loop constructs
- **`ApiCallNode`**: HTTP/API call operations
- **`AgentCallNode`**: AI agent invocations with tool management
- **`PromptNode`**: AI prompt nodes for model interactions
- **`StartNode`/`EndNode`**: Flow start and end markers
- **`EmptyNode`**: Placeholder for empty flow sections
- **`DraftNode`**: Nodes in draft/editing state
- **`CommentNode`**: Documentation annotations
- **`ButtonNode`**: Interactive action buttons
- **`ErrorNode`**: Error handling display

### 4. Links and Ports (`src/components/NodePort/`, `src/components/NodeLink/`)
- **NodePort**: Connection points on nodes (input/output)
- **NodeLink**: Visual connections between nodes with routing capabilities

## Type System

### Core Types (from `@wso2/ballerina-core`)
```typescript
- Flow: Root container for the entire flow
- FlowNode: Individual node in the flow with branches and properties
- Branch: Container for child nodes (e.g., if-then, if-else, while-body)
- LineRange: Source code position information
- NodePosition: Diagram positioning data
- ToolData: AI tool configuration data
- AgentData: AI agent configuration
```

### Diagram-Specific Types
```typescript
- NodeModel: Union type of all possible node models
- LinkableNodeModel: Nodes that can have links (excludes ButtonNode)
- FlowNodeStyle: Visual styling options ("default" | "ballerina-statements")
```

## Key Features

### 1. Breakpoint Integration
- Supports active breakpoint highlighting
- Automatic error handler expansion when breakpoint is in onFailure branches
- Visual indicators for breakpoint states

### 2. AI Integration
- Agent nodes with tool management
- Prompt nodes for model interactions
- Support for multiple AI model providers (OpenAI, Anthropic, Azure, Ollama, etc.)
- Tool selection and configuration UI

### 3. Interactive Editing
- Add/remove nodes through UI interactions
- Comment addition
- Node property editing
- Connection selection and management
- Right-click context menu for node actions (Edit, Source, Delete, Breakpoints)

### 4. Error Handling
- Error flow visualization toggle
- Error handler expansion/collapse
- Error node rendering for problematic code sections

### 5. Layout and Positioning
- Custom positioning for complex node types
- Zoom and pan persistence
- Responsive node sizing based on content

## Constants and Configuration

### Layout Constants (`src/resources/constants.ts`)
```typescript
- NODE_WIDTH: 280px (standard node width)
- NODE_HEIGHT: 50px (standard node height)
- NODE_GAP_Y: 50px (vertical spacing)
- NODE_GAP_X: 60px (horizontal spacing)
- IF_NODE_WIDTH: 65px (conditional node width)
- WHILE_NODE_WIDTH: 52px (loop node width)
```

### Node Types Enum
```typescript
enum NodeTypes {
    BASE_NODE = "base-node",
    IF_NODE = "if-node",
    WHILE_NODE = "while-node",
    API_CALL_NODE = "api-call-node",
    AGENT_CALL_NODE = "agent-call-node",
    // ... etc
}
```

## Usage Patterns

### Basic Diagram Rendering
```typescript
import { Diagram } from "@wso2/bi-diagram";

<Diagram
  model={flowData}
  onAddNode={handleAddNode}
  onDeleteNode={handleDeleteNode}
  onNodeSelect={handleNodeSelect}
  breakpointInfo={breakpointData}
  readOnly={false}
/>
```

### Visitor Usage for Flow Manipulation
```typescript
import { AddNodeVisitor, traverseFlow } from "@wso2/bi-diagram";

const addNodeVisitor = new AddNodeVisitor(parentNode, targetPosition, newNodeData);
traverseFlow(flowModel, addNodeVisitor);
const updatedFlow = addNodeVisitor.getUpdatedFlow();
```

## Development Guidelines

### Adding New Node Types
1. Create model class extending appropriate base class
2. Implement widget component with required props interface
3. Create factory class for node instantiation
4. Register factory in diagram engine setup
5. Add node type to constants and type unions
6. Update visitors as needed for special handling

### Implementing Right-Click Context Menus
To add right-click context menu support to a node type:

1. **Add Menu Button Reference State**:
   ```typescript
   const [menuButtonElement, setMenuButtonElement] = useState<HTMLElement | null>(null);
   ```

2. **Add Context Menu Handler**:
   ```typescript
   const handleOnContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
       event.preventDefault(); // Prevent browser's default context menu
       setAnchorEl(menuButtonElement || event.currentTarget);
   };
   ```

3. **Add Ref to Menu Button**:
   ```typescript
   <MenuButton ref={setMenuButtonElement} onClick={handleOnMenuClick}>
   ```

4. **Add Context Menu to Main Container**:
   ```typescript
   <NodeContainer onContextMenu={!readOnly ? handleOnContextMenu : undefined}>
   ```

This pattern ensures the context menu appears near the menu button for consistent UX.

### Multi-Menu Context Support (AgentCallNode Example)
For complex nodes with multiple menus like AgentCallNode:

1. **Multiple Menu Button References**:
   ```typescript
   const [menuButtonElement, setMenuButtonElement] = useState<HTMLElement | null>(null);
   const [memoryMenuButtonElement, setMemoryMenuButtonElement] = useState<HTMLElement | null>(null);
   ```

2. **Separate Context Menu Handlers**:
   ```typescript
   const handleOnContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
       event.preventDefault();
       setAnchorEl(menuButtonElement || event.currentTarget);
   };
   
   const handleMemoryContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
       event.preventDefault();
       event.stopPropagation();
       setMemoryMenuAnchorEl(memoryMenuButtonElement || event.currentTarget);
   };
   ```

3. **Context Menu on Different Areas**:
   - Main node container: triggers main menu
   - Memory card/button: triggers memory-specific menu  
   - Tool circles (SVG): triggers tool-specific menu for that tool

4. **SVG Context Menu Support**:
   ```typescript
   <g onContextMenu={(e) => {
       if (!readOnly) {
           e.preventDefault();
           handleToolMenuClick(e as any, tool);
       }
   }}>
   ```

### Visitor Implementation
1. Implement `BaseVisitor` interface from `@wso2/ballerina-core`
2. Handle `visitNode()` and `visitBranch()` methods
3. Manage visitor state for data collection/transformation
4. Use `traverseFlow()` utility for execution

### Styling and Theming
- Uses Emotion for CSS-in-JS styling
- WSO2 design system integration via `@wso2/ui-toolkit`
- Custom font icons for node types
- Responsive design considerations

## Testing Infrastructure

### Storybook Integration
- Component stories in `src/stories/`
- Sample flow data for testing different scenarios
- Visual regression testing capabilities

### Test Data Patterns
- JSON files with flow structures for various scenarios
- Coverage for conditional flows, loops, error handling
- AI agent and prompt node examples

## Performance Considerations

### Optimization Features
- Memoized diagram component (`MemoizedDiagram`)
- Selective re-rendering based on flow changes
- Efficient visitor pattern implementation
- Canvas layer management for performance

### Memory Management
- Proper cleanup of diagram engine resources
- Event listener deregistration
- Zoom/position state persistence

## Extension Points

### Custom Node Types
- Extend base node classes
- Implement required interfaces
- Register with engine factories

### Custom Visitors
- Implement `BaseVisitor` interface
- Handle flow traversal patterns
- Integrate with existing visitor pipeline

### Callback Customization
- Node interaction callbacks
- Connection handling
- Breakpoint management
- AI model integration

## Common Integration Patterns

### VS Code Extension Integration
- Webview communication for node interactions
- Source code navigation callbacks
- Language server integration for completions
- File system operations for tool management

### Ballerina Language Server
- AST data transformation to flow format
- Source position mapping
- Compilation error integration
- Live editing support

This context provides a comprehensive understanding of the bi-diagram package architecture, enabling AI agents to effectively work with and extend the diagram functionality.
