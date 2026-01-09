# Example Features

We want an in-app chat AI agent to be able to perform actions in the app.
We could implement our own custom solution for this, but thankfully, some very experienced developers are creating a framework which will allow us to add this kind of functionality to an app.  This framework is called [Hashbrown](https://hashbrown.dev/).  It hasn't taken off yet, but I believe it will.  When I first had some time to try it out, it had about 300 stars on GitHub.  The repo a few weeks later now has over 500 stars indicating a  slowly growing awareness of it.

In this guide, I explore what it takes to add functionality to the demo React app

Lets find out how to add functionality to allow the AI Chat agent to perform actions on the React UI.

Initially, the smart-home React sample AI chat will not perform actions by using the components you see in the UI.  For example if you ask in the chat to delete a light, it will apologize and say that is not something it can do.

To create this functionality, we will have to enable the delete feature and create a tool to allow the chat to use it.  For this we will add a delete light function to the chat interface using tools.

We would also like the AI to be able to respond to this kind of prompt:

*Open the "Add Scene" modal on the scenes page, enter the name "New Scene" and open the scene lights select and choose "Office Light".  Then press the add scene button in the modal to confirm the new scene.*

---

## Table of Contents

- [Understanding Components, Tools and Triggers](#understanding-components-tools-and-triggers)
- [Creating a Delete Tool](#creating-a-delete-tool)
  - [Step 1: Create the Delete Light Tool](#step-1-create-the-delete-light-tool)
  - [Step 2: Add the Tool to the Chat Panel](#step-2-add-the-tool-to-the-chat-panel)
  - [Step 3: Update the System Prompt](#step-3-update-the-system-prompt)
- [Best Practices](#best-practices)
- [Summary](#summary)
- [Adding a scene](#adding-a-scene)
- [Opening a select](#opening-a-select)
  - [Step 1: Make the Select Controlled](#step-1-make-the-select-controlled)
  - [Step 2: Delay Adding Initial Lights](#step-2-delay-adding-initial-lights)
  - [Step 3: Animate the Selection](#step-3-animate-the-selection)
  - [Step 4: Prevent Duplicate Adds](#step-4-prevent-duplicate-adds)
- [Enabling the Add scene button](#enabling-the-add-scene-button)
  - [Create the `clickButtonByText` Tool](#create-the-clickbuttonbytext-tool)
  - [Add the Tool to the Chat Panel](#add-the-tool-to-the-chat-panel)
  - [Update the System Prompt](#update-the-system-prompt)
- [Conclusion](#conclusion)

---

## Understanding Components, Tools and Triggers

Before we begin, it's important to understand the difference:

- **Components** (`exposeComponent()`) - UI elements that the AI can render. The AI cannot directly interact with them; users must click buttons or interact with the UI. Examples: displaying cards, markdown content, or interactive controls that require user input.
- **Tools** (`useTool()`) - Functions that the AI can call directly to perform actions programmatically. The AI executes these functions automatically when appropriate. Examples: deleting items, updating data, querying information.
- **Triggers** (`exposeComponent()` with `useEffect` & `useRef`) - Control component state to programmatically control UI. They combine the declarative nature of components with the automatic execution of tools.  The "auto-action" is a React pattern: `useEffect()` to run side effects on mount or when dependencies change and `useRef()` to access DOM elements.
- **DOM Interaction Tools** (`useTool()` with DOM manipulation) - Tools that directly interact with the DOM to perform UI actions like clicking buttons, filling inputs, or selecting dropdown options. These are used when you need the AI to interact with existing UI elements that are already rendered (e.g., clicking a button in an open modal). Unlike triggers which use React patterns, DOM interaction tools use `document.querySelector()`, `getElementById()`, and native DOM methods.
- **Component schemas** — Hashbrown's way of describing component props to the AI.

**For delete functionality, you should use a tool**, not a component. This allows the AI to delete items directly when asked (e.g., "Delete the kitchen light"), rather than just showing a button that the user must click.

**For opening modals or dialogs**, you should use a **trigger component**. This allows the AI to open UI elements programmatically (e.g., "Open the Add Scene modal"), but the user still completes the form or interaction. Triggers are useful when you want the AI to initiate a workflow that requires user input to complete.

**For interacting with elements in already-open modals** (like clicking buttons or filling form fields), you should use **DOM interaction tools**. These allow the AI to programmatically interact with rendered UI elements when React state management or component patterns aren't sufficient.

<image of chat with components ready for the user to complete an action>

In our case, we want the AI to open the UI elements and automatically carry out the prompt instructions.  For this we will use a Hashbrown `useTool()` hook.

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

You might wonder why we don't also expose a `DeleteLightButton` component. The reason is by only providing tools for actions, we make it clear to the AI that it should perform the action directly.

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

## Adding a scene

We want to AI to be able to respond to a prompt like this:

*Open the “Add Scene” modal on the scenes page, enter the name “New Scene” and open the scene lights select and choose “Office Light” please.*

However, the response will be something like *"I'm unable to open modals or directly interact with scenes."*

First, lets enable the AIs ability to 0pen the “Add Scene” modal.  To do this we need to create a new trigger.  Lets call it AddSceneDialogTrigger and add it to the /src/app/views/components directory.

The `AddSceneDialogTrigger` component should automatically open the Add Scene dialog when rendered by the AI. The component:

1. **Wraps the existing `SceneDialogForm`** - Reuses the existing dialog component that handles scene creation
2. **Auto-triggers on render** - Uses a hidden button that automatically clicks when the component mounts, opening the dialog
3. **Exposed to the AI** - Added to the `RichChatPanel` using `exposeComponent()` as the `<AddScene>` component
4. **System prompt updated** - Added instructions telling the AI when to use the component (e.g., when users ask to "add a scene", "create a new scene", etc.)

When a user asks to add or create a scene, the AI can now render `<AddScene />` which will automatically open the Add Scene modal, allowing the user to:
- Enter a scene name
- Select lights to add to the scene
- Configure brightness levels
- Get AI-powered recommendations for which lights to include based on the scene name

This approach uses a **component** rather than a **tool** because opening a modal is a UI interaction that requires user input to complete the scene configuration. The AI can trigger the modal, but at the moment, the user must complete the form.

## Opening a select

Next, lets enable the AI to open the "Scene Lights" select and choose an item automatically.

To enable the AI to open the "Scene Lights" select and automatically choose a light, we need to:

1. Make the Select component controlled (so we can programmatically open it and set its value)
2. Delay adding `initialLights` to the scene state (so they remain in `availableLights` and the Select can render)
3. Animate the selection process (open the select, show the selection, then add the light)

### Step 1: Make the Select Controlled

In `SceneDialogForm.tsx`, we made the Select component controlled by adding state for `selectOpen` and `selectValue`:

```typescript:samples/smart-home/react/src/app/views/components/SceneDialogForm.tsx
const [selectOpen, setSelectOpen] = useState(false);
const [selectValue, setSelectValue] = useState<string>('');
```

Then we connected these to the Select component:

```typescript:samples/smart-home/react/src/app/views/components/SceneDialogForm.tsx
<Select
  open={selectOpen}
  onOpenChange={setSelectOpen}
  value={selectValue}
  onValueChange={handleAddLight}
>
  <SelectTrigger id="addLight" className="w-full">
    <SelectValue placeholder="Select a light to add" />
  </SelectTrigger>
  <SelectContent>
    {/* ... */}
  </SelectContent>
</Select>
```

### Step 2: Delay Adding Initial Lights

The key insight is that if `initialLights` are added to `sceneLights` immediately, they won't be in `availableLights` (which filters out lights already in the scene). This means the Select won't render because `availableLights.length === 0`.

To fix this, we don't add `initialLights` to the initial state:

```typescript:samples/smart-home/react/src/app/views/components/SceneDialogForm.tsx
// Don't add initialLights to state immediately if we want to animate the selection
// Instead, we'll add them after the animation
const [sceneLights, setSceneLights] = useState<SceneLightModel[]>(
  scene?.lights || [], // Note: NOT initialLights || []
);
```

### Step 3: Animate the Selection

We use a `useEffect` to animate the selection when the dialog opens with `initialLights`:

```typescript:samples/smart-home/react/src/app/views/components/SceneDialogForm.tsx
useEffect(() => {
  if (open && initialLights && initialLights.length > 0 && !hasAnimatedInitialLights) {
    // Find the first light from initialLights that exists in the lights array
    const lightToAnimate = initialLights.find((initialLight) =>
      lights.some((light) => light.id === initialLight.lightId),
    );

    if (lightToAnimate) {
      // Small delay to ensure the dialog is fully rendered
      const timer = setTimeout(() => {
        setSelectValue(lightToAnimate.lightId);
        setSelectOpen(true);
        // After a brief moment, add the light and close the select
        setTimeout(() => {
          // Add the light using functional update to ensure we have latest state
          setSceneLights((prev) => {
            // Check if light is already added (shouldn't be, but defensive)
            if (prev.some((sceneLight) => sceneLight.lightId === lightToAnimate.lightId)) {
              return prev;
            }
            return [...prev, { lightId: lightToAnimate.lightId, brightness: 100 }];
          });
          // Close the select after adding
          setTimeout(() => {
            setSelectOpen(false);
            setSelectValue('');
            setHasAnimatedInitialLights(true);
            // Add any remaining initialLights that weren't animated
            setSceneLights((prev) => {
              const remainingLights = initialLights
                .slice(1)
                .filter(
                  (light) =>
                    !prev.some(
                      (sceneLight) => sceneLight.lightId === light.lightId,
                    ),
                );
              if (remainingLights.length > 0) {
                return [...prev, ...remainingLights];
              }
              return prev;
            });
          }, 300);
        }, 500); // Wait before selecting
      }, 100);

      return () => clearTimeout(timer);
    }
  }
}, [open, initialLights, lights, hasAnimatedInitialLights]);
```

### Step 4: Prevent Duplicate Adds

We also added a check in `handleAddLight` to prevent adding lights that are already in the scene:

```typescript:samples/smart-home/react/src/app/views/components/SceneDialogForm.tsx
const handleAddLight = (lightId: string) => {
  // Don't add if light is already in the scene (prevents duplicates)
  if (sceneLights.some((sceneLight) => sceneLight.lightId === lightId)) {
    setSelectValue(''); // Reset select value
    return;
  }

  const light = lights.find((l) => l.id === lightId);
  if (light) {
    setSceneLights([...sceneLights, { lightId, brightness: 100 }]);
    // Reset select value after adding
    setSelectValue('');
  }
};
```

This is important because when we programmatically set `selectValue`, it triggers `onValueChange={handleAddLight}`, which could add the light again if we didn't check.

### How It Works

When the AI renders `<AddScene lightIds={["office-light-id"]} />`:

1. **Dialog Opens** - `AddSceneDialogTrigger` auto-clicks the button, opening the dialog
2. **Initial State** - `sceneLights` starts empty (not including `initialLights`)
3. **Select Renders** - Because the light isn't in `sceneLights` yet, it's in `availableLights`, so the Select renders
4. **Animation Begins** - After 100ms, the `useEffect` sets `selectValue` and `selectOpen(true)`
5. **Select Opens** - The Select dropdown opens, showing the available lights
6. **Light Selected** - The light appears selected in the dropdown
7. **Light Added** - After 500ms, the light is added to `sceneLights` via `setSceneLights`
8. **Select Closes** - After another 300ms, the select closes and resets

### Key Points

- **Controlled Components** - The Select must be controlled (`open`, `value`, `onValueChange`) to allow programmatic interaction
- **State Timing** - Don't add `initialLights` to initial state if you want to animate the selection
- **Functional Updates** - Use `setSceneLights((prev) => ...)` to avoid stale closures
- **Duplicate Prevention** - Check if a light is already in the scene before adding it
- **Animation Timing** - Use multiple `setTimeout` calls with appropriate delays to create a smooth animation

### Complete Flow Example

```
User: "open the Scene Lights select and choose Office Light please"

AI: [Calls getLights tool]
    [Receives: [{ id: "office-light-id", name: "Office Light", ... }, ...]]
    [Finds "Office Light" and extracts id: "office-light-id"]
    [Renders] <AddScene lightIds={["office-light-id"]} />

Result:
1. Modal opens
2. Select dropdown opens automatically
3. "Office Light" appears selected
4. Light is added to the scene
5. Select closes
```

This creates a smooth, visual experience where the user can see the AI's selection process in action, making it clear that the AI understood their request and acted on it.

## Enabling the Add scene button

After the above actions, we want the user prompt to be able to complete the task in the modal to confirm the new scene.

The prompt would be something like this: *press the add scene button in the modal to confirm the new scene.*

To enable the AI to click the "Add Scene" button, we need to create a **DOM interaction tool** that can find and click buttons by their text content.

### Create the `clickButtonByText` Tool

```typescript:samples/smart-home/react/src/app/shared/RichChatPanel.tsx
const clickButtonByText = useTool({
  name: 'clickButtonByText',
  description: 'Click a button by finding it by its text content. Use this to click buttons in modals, like "Add Scene", "Update Scene", "Cancel", etc. This tool will automatically close any open dropdowns before clicking.',
  schema: s.object('Click button by text', {
    buttonText: s.string('The text content of the button to click (e.g., "Add Scene", "Update Scene", "Cancel")'),
  }),
  handler: (input) => {
    const { buttonText } = input;
    
    // Helper to check if select is open
    const checkIfSelectOpen = () => {
      const options = Array.from(
        document.querySelectorAll('[role="option"], [data-radix-select-item]')
      );
      return options.length > 0;
    };
    
    // Helper to close select
    const closeSelect = () => {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        }, i * 50);
      }
    };
    
    // First, ensure any open select dropdowns are closed
    const wasOpen = checkIfSelectOpen();
    if (wasOpen) {
      closeSelect();
    }
    
    // Wait for dropdowns to close, then find and click the button
    return new Promise((resolve, reject) => {
      const findAndClickButton = (attempt: number) => {
        setTimeout(() => {
          // Double-check select is closed
          const stillOpen = checkIfSelectOpen();
          if (stillOpen && attempt < 5) {
            closeSelect();
            findAndClickButton(attempt + 1);
            return;
          }
          
          // Find all buttons and filter out hidden ones or those in dropdowns
          const buttons = Array.from(document.querySelectorAll('button'));
          const modalButtons = buttons.filter((btn) => {
            if (btn.classList.contains('hidden') || 
                btn.hasAttribute('hidden') ||
                window.getComputedStyle(btn).display === 'none') {
              return false;
            }
            const isInSelect = btn.closest('[role="listbox"]') || 
                               btn.closest('[data-radix-select-content]');
            return btn.offsetParent !== null && 
                   btn.closest('[role="dialog"]') !== null &&
                   !isInSelect;
          });
          
          const button = modalButtons.find(
            (btn) => btn.textContent?.trim() === buttonText.trim()
          );

          if (!button) {
            reject(
              new Error(`Button with text "${buttonText}" not found. Make sure the modal is open and the button exists.`),
            );
            return;
          }
          
          // Ensure no select dropdowns are open before clicking
          const finalCheck = checkIfSelectOpen();
          if (finalCheck) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
            setTimeout(() => {
              button.click();
              resolve({ success: true, buttonText });
            }, 100);
          } else {
            button.click();
            resolve({ success: true, buttonText });
          }
        }, wasOpen ? 200 : 50);
      };

      findAndClickButton(1);
    });
  },
  deps: [],
});
```

**Key Points:**
- Closes any open select dropdowns before clicking (prevents conflicts)
- Filters out hidden buttons and buttons inside select portals
- Only targets visible buttons inside the dialog
- Uses native `.click()` method for React compatibility

### Add the Tool to the Chat Panel

Add `clickButtonByText` to the `tools` array in `useUiChat`:

```typescript:samples/smart-home/react/src/app/shared/RichChatPanel.tsx
const { messages, sendMessage, /* ... */ } = useUiChat({
  model: 'gpt-4.1',
  debugName: 'RichChatPanel',
  system: prompt`...`,
  tools: [
    getLights, 
    controlLight, 
    deleteLight, 
    clickButtonByText,  // Add this
    toolJavaScript
  ],
  components: [/* ... */],
});
```

### Update the System Prompt

Add instructions for clicking the button:

```typescript
system: prompt`
  // ... existing instructions ...

  ### Completing the Add Scene Modal
  When the user asks you to click the "Add Scene" button to confirm the scene:
  - Use clickButtonByText with buttonText="Add Scene" (or "Update Scene" if editing)
  - The tool will automatically close any open dropdowns before clicking
  - Example:
    <user>Press the add scene button in the modal to confirm the new scene</user>
    <assistant>
      <tool-call>clickButtonByText</tool-call>
      <tool-args>{"buttonText": "Add Scene"}</tool-args>
    </assistant>
`,
```

This enables the AI to click the "Add Scene" button to submit the form and complete the scene creation workflow.

## Conclusion

Having an in-app chat bot that can control the apps UI and work with a user to perform tasks is a very powerful feature.

Hashbrown is not the only option for this.  You may be able to think of some big companies that are already doing this, such as Windows Copilot.  There are also testing frameworks like Cypress or Playwritght that also allow a developer to create test scripts which control the UI and confirm app behavior.  I feel like there will be more options in this field, and I hope that Hashbrown will continue to evolve and be one of the open source options for this.

Of course, Hashbrown is just at the beginning.
Currently [@hashbrownai/core on npm](https://www.npmjs.com/package/@hashbrownai/core) is as version 0.4.1 which was published 20 days ago.

The React app uses Hashbrown version 0.4.1-alpha.1 which means they are keeping the versions in line for now.

Being an early adopter means that things can and will change, so don't expect this guide to work if that happens.  However, I will keep an eye on it and time permitting update or create a new guide when things do.
