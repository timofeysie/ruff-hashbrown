# Example Features: Adding Delete Functionality to Hashbrown Chat

This guide demonstrates how to add delete functionality to a Hashbrown chat interface using tools. We'll use the smart-home React sample as our example, showing how to enable the AI to delete lights directly.

---

## Understanding Components vs Tools

Before we begin, it's important to understand the difference:

- **Components** (`exposeComponent()`) - UI elements that the AI can render. The AI cannot directly interact with them; users must click buttons or interact with the UI.
- **Tools** (`useTool()`) - Functions that the AI can call directly to perform actions programmatically.

**For delete functionality, you should use a tool**, not a component. This allows the AI to delete items directly when asked (e.g., "Delete the kitchen light"), rather than just showing a button that the user must click.

---

## Creating a Delete Tool

Tools allow the AI to perform actions directly. This is essential for delete functionality because users expect the AI to delete items when asked, not just show a button.

### Step 1: Create the Delete Light Tool

In your chat panel component, use the `useTool` hook:

```typescript:samples/smart-home/react/src/app/shared/RichChatPanel.tsx
import { useTool, useUiChat } from '@hashbrownai/react';
import { s } from '@hashbrownai/core';
import { useSmartHomeStore } from '../store/smart-home.store';

export const RichChatPanel = () => {
  // ... other tools (getLights, controlLight, etc.)

  const getLights = useTool({
    name: 'getLights',
    description: 'Get the current lights. Returns an array of light objects, each with an id (string), name (string), and brightness (number). Use the id field when calling other tools like deleteLight or controlLight.',
    handler: () => Promise.resolve(useSmartHomeStore.getState().lights),
    deps: [],
  });

  const deleteLight = useTool({
    name: 'deleteLight',
    description: 'Delete a light by its id. You must first call getLights to find the light by name, then use the id field from that light object. The lightId must be the exact id string from the light object. Returns the deleted light id if successful, or an error if the light was not found.',
    schema: s.object('Delete light input', {
      lightId: s.string('The id of the light to delete. This must be the exact id string from the light object returned by getLights.'),
    }),
    handler: (input) => {
      const { lightId } = input;
      const store = useSmartHomeStore.getState();
      const light = store.lights.find((l) => l.id === lightId);

      if (!light) {
        return Promise.reject(
          new Error(
            `Light with id "${lightId}" not found. Make sure to call getLights first to get the correct light id.`,
          ),
        );
      }

      store.deleteLight(lightId);

      return Promise.resolve({
        success: true,
        deletedLightId: lightId,
        deletedLightName: light.name,
      });
    },
    deps: [],
  });

  const { messages, sendMessage, /* ... */ } = useUiChat({
    model: 'gpt-4.1',
    debugName: 'RichChatPanel',
    system: prompt`...`,
    components: [/* ... */],
    tools: [getLights, controlLight, deleteLight, toolJavaScript],  // Add deleteLight
  });

  // ... rest of component
};
```

**Key Points:**
- Use `useTool()` hook to create the tool
- Define a `name` and `description` for the tool
- Use Skillet (`s.object()`, `s.string()`) to define the input schema
- The `handler` receives the parsed input and performs the action
- Access your store using `useSmartHomeStore.getState()`
- Return a Promise with the result
- Include `deps: []` for dependency tracking (empty if no dependencies)

### Step 2: Add the Tool to the Chat Panel

Make sure to include `deleteLight` in the `tools` array when calling `useUiChat`:

```typescript
const { messages, sendMessage, /* ... */ } = useUiChat({
  model: 'gpt-4.1',
  debugName: 'RichChatPanel',
  system: prompt`...`,
  components: [/* ... */],
  tools: [getLights, controlLight, deleteLight, toolJavaScript],  // Include deleteLight
});
```

### Step 3: Update the System Prompt

It's important to update your system prompt to explicitly instruct the AI to use tools for actions, not components. Add clear instructions and examples:

```typescript
system: prompt`
  You are a smart home assistant. You can control the lights in the house. 
  You should not stringify (aka escape) function arguments

  Always prefer writing a single script for the javascript tool over calling 
  the javascript tool multiple times.

  ### IMPORTANT: Use Tools for Actions
  When the user asks you to perform an action (delete, update, control), **always use the appropriate tool** (deleteLight, controlLight, etc.) to perform the action directly. Never show buttons for actions you can perform with tools.

  ### EXAMPLES

  <user>What are the lights in the living room?</user>
  <assistant>
    <tool-call>getLights</tool-call>
  </assistant>
  <assistant>
    <ui>
      <Card title="Living Room Lights" description="Here are the lights in the living room:">
        <LightChat lightId="..." />
        <LightChat lightId="..." />
      </Card>
    </ui>
  </assistant>

      <user>Delete the kitchen light</user>
      <assistant>
        <tool-call>getLights</tool-call>
      </assistant>
      <assistant>
        <tool-call>deleteLight</tool-call>
      </assistant>
      <assistant>
        <ui>
          <Markdown>I have deleted the kitchen light.</Markdown>
        </ui>
      </assistant>

      ### CRITICAL: Finding Lights by Name to Delete
      When the user asks to delete a light by name (e.g., "Delete the kitchen light" or "Remove the bedroom light"):
      1. **ALWAYS call getLights first** - This returns an array of light objects, each with: { id: string, name: string, brightness: number }
      2. **Find the matching light** - Search the array for a light where the name matches the user's request (case-insensitive, partial matches are acceptable)
      3. **Extract the id** - Use the exact `id` string from the matching light object
      4. **Call deleteLight** - Pass that exact `id` as the `lightId` parameter
      5. **NEVER guess IDs** - You must always call getLights first to get the actual ID. Never use made-up IDs or try to construct them.
      6. **If no match found** - Tell the user the light was not found rather than trying to delete with a guessed ID
    `,
```

**Key Points:**
- Explicitly state that tools should be used for actions
- Provide clear examples showing the tool being called
- Never show buttons for actions that can be performed with tools
- The AI should call the tool directly, then confirm with a message

---

## Why Not Expose a Delete Component?

You might wonder why we don't also expose a `DeleteLightButton` component. The reason is:

1. **User Experience** - Users expect the AI to perform actions directly when asked, not show buttons they must click
2. **AI Capability** - The AI cannot click buttons; it can only call tools
3. **Clarity** - By only providing tools for actions, we make it clear to the AI that it should perform the action directly

If you want to show a delete button in your UI for manual deletion, you can add it to your regular (non-chat) UI components. But for chat interactions, tools are the right approach.

---

## How It Works

When a user asks to delete a light:

1. **AI calls getLights** - The AI first calls `getLights` to retrieve all lights and their IDs
2. **AI finds the light** - The AI searches the returned array to find the light matching the user's request by name
3. **AI extracts the ID** - The AI extracts the exact `id` string from the matching light object
4. **AI calls deleteLight** - The AI calls `deleteLight` with the exact `lightId` from step 3
5. **Tool executes** - The handler validates the light exists, then calls your store to delete it
6. **AI confirms** - The AI renders a confirmation message using a markdown component

**Example Flow:**

```
User: "Delete the kitchen light"

AI: [Calls getLights tool]
    [Receives: [{ id: "abc-123", name: "Kitchen Light", brightness: 50 }, ...]]
    [Finds light where name matches "kitchen light"]
    [Extracts id: "abc-123"]
    [Calls deleteLight tool with lightId="abc-123"]
    [Renders] "I have deleted the kitchen light."
```

**Important:** The AI must always call `getLights` first to get the actual light IDs. It cannot guess or construct IDs - it must retrieve them from the `getLights` response.

### Error Handling

The `deleteLight` tool includes error handling:
- If the light ID is not found, it returns a clear error message
- The error instructs the AI to call `getLights` first
- This helps prevent the AI from trying to delete with incorrect IDs

---

## Complete Example

Here's a complete example showing how to set up the delete tool in a React chat panel:

```typescript:samples/smart-home/react/src/app/shared/RichChatPanel.tsx
import { Chat, prompt, s } from '@hashbrownai/core';
import {
  exposeComponent,
  useRuntime,
  useRuntimeFunction,
  useTool,
  useToolJavaScript,
  useUiChat,
} from '@hashbrownai/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSmartHomeStore } from '../store/smart-home.store';
import { LightChatComponent } from '../views/components/LightChatComponent';
import { Button } from './button';
import { CardComponent } from './CardComponent';
import { MarkdownComponent } from './MarkdownComponent';
import { RichMessage } from './RichMessage';
import { ScrollArea } from './scrollarea';
import { Textarea } from './textarea';
import { Light } from '../models/light.model';

export const RichChatPanel = () => {
  const getLights = useTool({
    name: 'getLights',
    description: 'Get the current lights. Returns an array of light objects, each with an id (string), name (string), and brightness (number). Use the id field when calling other tools like deleteLight or controlLight.',
    handler: () => Promise.resolve(useSmartHomeStore.getState().lights),
    deps: [],
  });

  const controlLight = useTool({
    name: 'controlLight',
    description: 'Control the light. Brightness is a number between 0 and 100.',
    schema: s.object('Control light input', {
      lightId: s.string('The id of the light'),
      brightness: s.number('The brightness of the light, between 0 and 100'),
    }),
    handler: (input) => {
      const { lightId, brightness } = input;

      useSmartHomeStore.getState().updateLight(lightId, {
        brightness,
      });

      return Promise.resolve(true);
    },
    deps: [],
  });

  const deleteLight = useTool({
    name: 'deleteLight',
    description: 'Delete a light by its id',
    schema: s.object('Delete light input', {
      lightId: s.string('The id of the light to delete'),
    }),
    handler: (input) => {
      const { lightId } = input;

      useSmartHomeStore.getState().deleteLight(lightId);

      return Promise.resolve({ success: true, deletedLightId: lightId });
    },
    deps: [],
  });

  // ... other tools and setup

  const { messages, sendMessage, resendMessages, isSending, isReceiving, isRunningToolCalls, stop } = useUiChat({
    model: 'gpt-4.1',
    debugName: 'RichChatPanel',
    system: prompt`
      You are a smart home assistant. You can control the lights in the house. 
      You should not stringify (aka escape) function arguments

      Always prefer writing a single script for the javascript tool over calling 
      the javascript tool multiple times.

      ### IMPORTANT: Use Tools for Actions
      When the user asks you to perform an action (delete, update, control), **always use the appropriate tool** (deleteLight, controlLight, etc.) to perform the action directly. Never show buttons for actions you can perform with tools.

      ### EXAMPLES

      <user>What are the lights in the living room?</user>
      <assistant>
        <tool-call>getLights</tool-call>
      </assistant>
      <assistant>
        <ui>
          <Card title="Living Room Lights" description="Here are the lights in the living room:">
            <LightChat lightId="..." />
            <LightChat lightId="..." />
          </Card>
        </ui>
      </assistant>

      <user>Delete the kitchen light</user>
      <assistant>
        <tool-call>getLights</tool-call>
      </assistant>
      <assistant>
        <tool-call>deleteLight</tool-call>
      </assistant>
      <assistant>
        <ui>
          <Markdown>I have deleted the kitchen light.</Markdown>
        </ui>
      </assistant>

      ### CRITICAL: Finding Lights by Name to Delete
      When the user asks to delete a light by name (e.g., "Delete the kitchen light" or "Remove the bedroom light"):
      1. **ALWAYS call getLights first** - This returns an array of light objects, each with: { id: string, name: string, brightness: number }
      2. **Find the matching light** - Search the array for a light where the name matches the user's request (case-insensitive, partial matches are acceptable)
      3. **Extract the id** - Use the exact `id` string from the matching light object
      4. **Call deleteLight** - Pass that exact `id` as the `lightId` parameter
      5. **NEVER guess IDs** - You must always call getLights first to get the actual ID. Never use made-up IDs or try to construct them.
      6. **If no match found** - Tell the user the light was not found rather than trying to delete with a guessed ID
    `,
    tools: [getLights, controlLight, deleteLight, toolJavaScript],
    components: [
      exposeComponent(LightChatComponent, {
        name: 'LightChat',
        description: 'A component that lets the user control a light',
        props: {
          lightId: s.string('The id of the light'),
        },
      }),
      exposeComponent(MarkdownComponent, {
        name: 'Markdown',
        description: 'Show markdown content to the user',
        children: 'text',
      }),
      exposeComponent(CardComponent, {
        name: 'Card',
        description: 'Show a card with children components to the user',
        children: 'any',
        props: {
          title: s.string('The title of the card'),
          description: s.streaming.string('The description of the card'),
        },
      }),
    ],
  });

  // ... rest of component implementation
};
```

**Note:** Notice that we do **not** expose a `DeleteLightButton` component. We only provide the `deleteLight` tool, which allows the AI to delete lights directly.

---

## Best Practices

### 1. Always Create Tools for Actions

If you want the AI to perform an action (delete, update, create), create a **tool**. Components are for UI display only, not for actions.

### 2. Provide Clear Descriptions

Tools should have clear, descriptive `description` fields. This helps the AI understand when to use them.

### 3. Use Proper Schema Types

Use Skillet schema types (`s.string()`, `s.number()`, `s.object()`, etc.) to define inputs. This ensures type safety and helps the AI understand the expected format.

### 4. Update System Prompts

Include explicit instructions in your system prompt:
- State that tools should be used for actions
- Provide clear examples showing tool usage
- Explicitly tell the AI not to show buttons for actions it can perform with tools

### 5. Handle Errors Gracefully

Make sure your store methods handle errors appropriately. The tool handler should:
- Validate inputs before performing actions (e.g., check if a light exists before deleting)
- Return clear error messages that help the AI understand what went wrong
- Provide guidance on how to fix the issue (e.g., "call getLights first")

Example error handling in the `deleteLight` tool:
```typescript
const light = store.lights.find((l) => l.id === lightId);

if (!light) {
  return Promise.reject(
    new Error(
      `Light with id "${lightId}" not found. Make sure to call getLights first to get the correct light id.`,
    ),
  );
}
```

### 6. Provide Detailed Tool Descriptions

Tool descriptions should be explicit about:
- What data the tool returns (for query tools like `getLights`)
- What the tool expects as input
- The relationship between tools (e.g., "call getLights first, then use the id field")
- What format the data is in (e.g., "array of objects with id, name, brightness")

### 7. Don't Expose Action Components

Avoid exposing components that perform actions (like delete buttons) to the AI. Instead, provide tools for those actions. This ensures the AI performs actions directly rather than showing buttons users must click.

### 8. Address Multi-Step Workflows

When deleting items by name (rather than ID), the AI needs to:
1. Query for the item (e.g., `getLights`)
2. Find the matching item by name
3. Extract the ID
4. Call the delete tool with that ID

Make this workflow explicit in your system prompt with step-by-step instructions. The "CRITICAL: Finding Lights by Name to Delete" section in the system prompt is an example of this.

---

## Summary

- **Tools** (`useTool()`) - Use for actions the AI can perform directly (delete, update, create, etc.)
- **Components** (`exposeComponent()`) - Use for UI display only (showing data, cards, lists, etc.)
- **For delete functionality** - Create a tool, not a component
- **System prompts** - Explicitly instruct the AI to use tools for actions

By implementing a tool for delete functionality, you enable the AI to:
- Delete items directly when asked
- Provide a natural, conversational experience
- Avoid showing buttons that users must click

This creates a more natural and powerful chat experience where the AI can perform actions directly based on user requests.
