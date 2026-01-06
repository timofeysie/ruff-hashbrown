
# Smart Home React Sample Application Architecture

## Introduction

The Smart Home React sample application (`samples/smart-home/react`) is a **React application** that demonstrates Hashbrown AI integration for building intelligent, AI-powered user interfaces. This application showcases how to use Hashbrown's React hooks to create a smart home management system where users can interact with lights, scenes, and scheduled scenes through natural language.

**Run Command**: `npx nx serve smart-home-react`

## Technology Stack

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **UI Components**: Custom components (shadcn/ui style)
- **AI Integration**: Hashbrown AI React hooks (`@hashbrownai/react`)
- **Icons**: Lucide React
- **Testing**: Vitest with React Testing Library

## Project Structure

```
samples/smart-home/react/
├── src/
│   ├── app/
│   │   ├── app.tsx                    # Root component with routing
│   │   ├── components/                # Reusable components
│   │   │   ├── dashboard/            # Dashboard view component
│   │   │   └── StoreInitializer.tsx  # Initializes sample data
│   │   ├── data/                      # Sample data
│   │   │   └── sample-data.ts        # Initial lights, scenes, scheduled scenes
│   │   ├── models/                    # TypeScript interfaces
│   │   │   ├── light.model.ts        # Light interface
│   │   │   ├── scene.model.ts        # Scene interface
│   │   │   └── scheduled-scene.model.ts
│   │   ├── shared/                    # Shared UI components
│   │   │   ├── button.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── RichChatPanel.tsx     # AI chat interface
│   │   │   └── ...
│   │   ├── store/                     # Zustand store
│   │   │   └── smart-home.store.ts   # Global state management
│   │   └── views/                     # Page views
│   │       ├── LightsView.tsx        # Lights management view
│   │       ├── ScenesView.tsx        # Scenes management view
│   │       ├── ScheduledScenesView.tsx
│   │       └── components/           # View-specific components
│   │           ├── Light.tsx
│   │           ├── LightChatComponent.tsx  # AI-exposed component
│   │           ├── Scene.tsx
│   │           └── ...
│   ├── main.tsx                       # Application entry point
│   └── styles.css                     # Global styles
├── vite.config.ts                     # Vite configuration
├── tailwind.config.js                 # Tailwind CSS configuration
└── package.json
```

## Core Architecture Patterns

### 1. Application Entry Point

The application starts in `main.tsx` with React Router setup:

```typescript
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/app';
import { StrictMode } from 'react';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

### 2. Root Component with Hashbrown Integration

The `App` component wraps the application with `HashbrownProvider` and sets up routing:

```typescript
import { HashbrownProvider } from '@hashbrownai/react';
import { Link, Route, Routes } from 'react-router-dom';

export function App() {
  const url = 'http://localhost:3000/api/chat';

  return (
    <HashbrownProvider url={url}>
      <StoreInitializer />
      <div className="grid grid-cols-7">
        <div className="col-span-4">
          {/* Navigation and Routes */}
          <Routes>
            <Route path="/lights" element={<LightsView />} />
            <Route path="/scenes" element={<ScenesView />} />
            <Route path="/scheduled-scenes" element={<ScheduledScenesView />} />
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </div>
        <div className="col-span-3 border-l p-2 h-screen overflow-hidden">
          <RichChatPanel />
        </div>
      </div>
      <Toaster />
    </HashbrownProvider>
  );
}
```

**Key Features**:

- `HashbrownProvider` wraps the app to provide AI chat functionality
- Split layout: 4 columns for main content, 3 columns for chat panel
- React Router for navigation
- Toast notifications for user feedback

### 3. State Management with Zustand

The application uses Zustand for global state management:

```typescript
import { create } from 'zustand';
import { Light } from '../models/light.model';
import { Scene } from '../models/scene.model';
import { ScheduledScene } from '../models/scheduled-scene.model';

interface SmartHomeState {
  lights: Light[];
  scenes: Scene[];
  scheduledScenes: ScheduledScene[];
  
  // Actions
  addLight: (light: Light) => void;
  updateLight: (id: string, light: Partial<Light>) => void;
  deleteLight: (id: string) => void;
  // ... more actions
}

export const useSmartHomeStore = create<SmartHomeState>((set) => ({
  lights: [],
  scenes: [],
  scheduledScenes: [],
  
  addLight: (light) => set((state) => ({ lights: [...state.lights, light] })),
  updateLight: (id, updatedLight) =>
    set((state) => ({
      lights: state.lights.map((light) =>
        light.id === id ? { ...light, ...updatedLight } : light,
      ),
    })),
  // ... more actions
}));
```

**Usage in Components**:

```typescript
const lights = useSmartHomeStore((state) => state.lights);
const updateLight = useSmartHomeStore((state) => state.updateLight);
```

### 4. Hashbrown AI Integration

The `RichChatPanel` component demonstrates comprehensive Hashbrown AI integration:

#### Tools

Tools allow the AI to interact with application state:

```typescript
// Get all lights
const getLights = useTool({
  name: 'getLights',
  description: 'Get the current lights',
  handler: () => Promise.resolve(useSmartHomeStore.getState().lights),
  deps: [],
});

// Control a light's brightness
const controlLight = useTool({
  name: 'controlLight',
  description: 'Control the light. Brightness is a number between 0 and 100.',
  schema: s.object('Control light input', {
    lightId: s.string('The id of the light'),
    brightness: s.number('The brightness of the light, between 0 and 100'),
  }),
  handler: (input) => {
    const { lightId, brightness } = input;
    useSmartHomeStore.getState().updateLight(lightId, { brightness });
    return Promise.resolve(true);
  },
  deps: [],
});
```

#### JavaScript Runtime

The runtime allows the AI to execute JavaScript code:

```typescript
const createLight = useRuntimeFunction({
  name: 'createLight',
  description: 'Create a new light',
  args: s.object('Create light input', {
    name: s.string('The name of the light'),
  }),
  result: s.object('Create light result', {
    lightId: s.string('The id of the light'),
  }),
  handler: (input) => {
    const { name } = input;
    const light: Light = {
      id: crypto.randomUUID(),
      name,
      brightness: 0,
    };
    useSmartHomeStore.getState().addLight(light);
    return Promise.resolve({ lightId: light.id });
  },
});

const runtime = useRuntime({
  functions: [createLight],
});

const toolJavaScript = useToolJavaScript({
  runtime,
});
```

#### UI Chat with Component Exposure

The chat interface uses `useUiChat` to enable AI-generated UI:

```typescript
const {
  messages,
  sendMessage,
  resendMessages,
  isSending,
  isReceiving,
  isRunningToolCalls,
  stop,
} = useUiChat({
  model: 'gpt-4.1',
  debugName: 'RichChatPanel',
  system: prompt`
    You are a smart home assistant. You can control the lights in the house.
    
    ### EXAMPLES
    <user>What are the lights in the living room?</user>
    <assistant>
      <tool-call>getLights</tool-call>
    </assistant>
    <assistant>
      <ui>
        <Card title="Living Room Lights" description="Here are the lights:">
          <LightChat lightId="..." />
        </Card>
      </ui>
    </assistant>
  `,
  tools: [getLights, controlLight, toolJavaScript],
  components: [
    exposeComponent(LightChatComponent, {
      name: 'LightChat',
      description: 'A component that lets the user control a light',
      props: {
        lightId: s.string('The id of the light'),
      },
    }),
    exposeComponent(CardComponent, {
      name: 'Card',
      description: 'Show a card with children components',
      children: 'any',
      props: {
        title: s.string('The title of the card'),
        description: s.streaming.string('The description of the card'),
      },
    }),
  ],
});
```

### 5. Component Patterns

#### View Components

View components are page-level components that display collections:

```typescript
export const LightsView = () => {
  const lights = useSmartHomeStore((state) => state.lights);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between py-2">
        <p className="text-lg font-bold">Lights</p>
        <LightDialogForm>
          <Button variant="outline">Add Light</Button>
        </LightDialogForm>
      </div>
      <div className="flex flex-col gap-4">
        {lights.map((light) => (
          <Light key={light.id} light={light} />
        ))}
      </div>
    </div>
  );
};
```

#### Item Components

Item components display individual items with controls:

```typescript
export const Light = ({ light }: LightProps) => {
  const updateLight = useSmartHomeStore((state) => state.updateLight);
  const deleteLight = useSmartHomeStore((state) => state.deleteLight);

  const handleBrightnessChange = (value: number[]) => {
    updateLight(light.id, { brightness: value[0] });
  };

  return (
    <div className="grid gap-2 items-center">
      <p className="truncate font-medium">{light.name}</p>
      <Slider
        max={100}
        value={[light.brightness]}
        onValueChange={handleBrightnessChange}
      />
      <p>{light.brightness}%</p>
      {/* Edit and Delete buttons */}
    </div>
  );
};
```

#### AI-Exposed Components

Components exposed to the AI must be simple and focused:

```typescript
export const LightChatComponent = ({ lightId }: LightProps) => {
  const light = useSmartHomeStore((state) =>
    state.lights.find((l) => l.id === lightId),
  );
  const updateLight = useSmartHomeStore((state) => state.updateLight);

  const handleBrightnessChange = (value: number[]) => {
    updateLight(lightId, { brightness: value[0] });
  };

  if (!light) {
    return <div>Light not found</div>;
  }

  return (
    <div className="grid gap-2 items-center">
      <p>{light.name}</p>
      <Slider
        max={100}
        value={[light.brightness]}
        onValueChange={handleBrightnessChange}
      />
      <p>{light.brightness}%</p>
    </div>
  );
};
```

**Key Differences from Regular Components**:

- Simpler interface (no edit/delete buttons)
- Direct state updates (no confirmation dialogs)
- Focused on single responsibility
- Used by AI to render UI dynamically

### 6. Data Models

The application uses TypeScript interfaces for type safety:

```typescript
// Light model
export interface Light {
  id: string;
  name: string;
  brightness: number;
}

// Scene model
export interface Scene {
  id: string;
  name: string;
  lights: SceneLight[];
}

export interface SceneLight {
  lightId: string;
  brightness: number;
}

// Scheduled Scene model
export interface ScheduledScene {
  id: string;
  sceneId: string;
  startDate: Date;
  recurrenceRule?: RecurrenceRule;
  isEnabled: boolean;
}
```

### 7. Sample Data Initialization

The `StoreInitializer` component loads sample data on first render:

```typescript
export function StoreInitializer() {
  const addLight = useSmartHomeStore((state) => state.addLight);
  const lights = useSmartHomeStore((state) => state.lights);

  if (lights.length === 0) {
    sampleLights.forEach((light) => addLight(light));
  }

  return null; // This component doesn't render anything
}
```

## Key Features

### 1. AI-Powered Chat Interface

- Natural language interaction with smart home
- Tool calling for state queries and updates
- JavaScript runtime for complex operations
- Component-based UI generation
- Streaming responses

### 2. Smart Home Management

- **Lights**: Individual light control with brightness sliders
- **Scenes**: Predefined light configurations
- **Scheduled Scenes**: Automated scene activation on schedule

### 3. Real-Time State Updates

- Zustand store provides reactive state
- Components automatically update when state changes
- AI can observe and modify state through tools

### 4. Responsive Layout

- Split-screen layout: content + chat panel
- Tailwind CSS for responsive design
- Grid-based layout system

## Development Best Practices

### Creating a New View

1. Create a view component in `src/app/views/`
2. Use Zustand store to access data
3. Follow the pattern: header + list of items
4. Include "Add" button with dialog form

**Example**:

```typescript
// src/app/views/NewView.tsx
import { useSmartHomeStore } from '../store/smart-home.store';
import { NewItem } from './components/NewItem';
import { NewItemDialogForm } from './components/NewItemDialogForm';

export const NewView = () => {
  const items = useSmartHomeStore((state) => state.items);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between py-2">
        <p className="text-lg font-bold">Items</p>
        <NewItemDialogForm>
          <Button variant="outline">Add Item</Button>
        </NewItemDialogForm>
      </div>
      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <NewItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};
```

### Creating a New Tool

1. Use `useTool` hook
2. Define clear schema with `s` (schema builder)
3. Keep handlers simple and focused
4. Return promises for async operations

**Example**:

```typescript
const myTool = useTool({
  name: 'myTool',
  description: 'Clear description of what the tool does',
  schema: s.object('My tool input', {
    param1: s.string('Description of param1'),
    param2: s.number('Description of param2'),
  }),
  handler: (input) => {
    const { param1, param2 } = input;
    // Perform action
    useSmartHomeStore.getState().updateSomething(param1, param2);
    return Promise.resolve({ success: true });
  },
  deps: [],
});
```

### Exposing Components to AI

1. Keep components simple and focused
2. Use clear prop names and descriptions
3. Provide good descriptions in `exposeComponent`
4. Handle missing data gracefully

**Example**:

```typescript
exposeComponent(MyComponent, {
  name: 'MyComponent',
  description: 'Clear description of what this component does',
  props: {
    itemId: s.string('The id of the item to display'),
    title: s.string('Optional title for the component'),
  },
});
```

### State Management Patterns

1. Use Zustand selectors for performance
2. Keep actions in the store
3. Use immutable updates
4. Handle cascading updates (e.g., deleting a light removes it from scenes)

**Example**:

```typescript
// In store
deleteLight: (id) =>
  set((state) => ({
    lights: state.lights.filter((light) => light.id !== id),
    // Cascade: remove from scenes
    scenes: state.scenes.map((scene) => ({
      ...scene,
      lights: scene.lights.filter((sceneLight) => sceneLight.lightId !== id),
    })),
  })),
```

### Styling with Tailwind

1. Use Tailwind utility classes
2. Follow consistent spacing (gap-2, gap-4, p-2, p-4)
3. Use flexbox and grid for layouts
4. Leverage responsive breakpoints

**Example**:

```typescript
<div className="flex flex-col gap-4">
  <div className="flex justify-between py-2">
    <p className="text-lg font-bold">Title</p>
  </div>
  <div className="grid grid-cols-3 gap-4">
    {/* Items */}
  </div>
</div>
```

## Running the Application

### Development

```bash
npx nx serve smart-home-react
```

The application will be available at `http://localhost:5200` (configured in `vite.config.ts`).

### Prerequisites

- Backend server running at `http://localhost:3000/api/chat`
- Node.js and npm installed
- Nx workspace set up

## Testing

- Test files use `.spec.tsx` extension
- Vitest for unit testing
- React Testing Library for component testing
- JSDOM for DOM testing

## Conclusion

The Smart Home React sample demonstrates how to build an AI-powered application using Hashbrown's React hooks. It showcases:

- State management with Zustand
- AI integration with tools, runtime, and component exposure
- Natural language interaction with application state
- Dynamic UI generation by AI
- Real-time state updates and reactivity

This serves as a comprehensive example for developers building AI-powered React applications with Hashbrown.
