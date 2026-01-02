import { useSmartHomeStore } from '../../store/smart-home.store';
import { Button } from '../../shared/button';

export interface DeleteLightButtonProps {
  lightId: string;
}

export const DeleteLightButton = ({ lightId }: DeleteLightButtonProps) => {
  const deleteLight = useSmartHomeStore((state) => state.deleteLight);

  const handleDelete = () => {
    deleteLight(lightId);
  };

  return (
    <Button variant="destructive" onClick={handleDelete}>
      Delete Light
    </Button>
  );
};

