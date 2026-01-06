import { useEffect, useRef } from 'react';
import { SceneDialogForm } from './SceneDialogForm';
import { Button } from '../../shared/button';

/**
 * Component that opens the Add Scene dialog when rendered.
 * Can be exposed to the AI to allow it to trigger opening the Add Scene modal.
 * When the AI renders this component, it will automatically open the Add Scene dialog.
 */
export const AddSceneDialogTrigger = () => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Auto-click the button when component mounts to open the dialog
  useEffect(() => {
    // Small delay to ensure the button is rendered and dialog is ready
    const timer = setTimeout(() => {
      buttonRef.current?.click();
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SceneDialogForm>
      <Button ref={buttonRef} variant="outline" className="hidden">
        Add Scene
      </Button>
    </SceneDialogForm>
  );
};

