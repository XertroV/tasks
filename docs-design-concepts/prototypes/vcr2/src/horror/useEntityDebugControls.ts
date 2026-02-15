import { useControls, button } from 'leva';
import type { EntityOpacityController } from './EntityOpacityController';

export interface EntityDebugConfig {
  visible: boolean;
  intensity: number;
  form: 'static_face' | 'corrupted_text' | 'glitch';
}

export function useEntityDebugControls(
  controllerRef: React.RefObject<EntityOpacityController | null>
): EntityDebugConfig {
  const config = useControls('Entity', {
    visible: { value: true },
    intensity: { value: 0.5, min: 0, max: 1, step: 0.1 },
    form: {
      value: 'static_face' as const,
      options: ['static_face', 'corrupted_text', 'glitch'] as const,
    },
  });

  useControls('Entity Actions', {
    'Flash Now': button(() => {
      if (controllerRef.current) {
        controllerRef.current.flash(config.intensity as number);
      }
    }),
    Build: button(() => {
      if (controllerRef.current) {
        controllerRef.current.build(config.intensity as number);
      }
    }),
    'Fade Out': button(() => {
      if (controllerRef.current) {
        controllerRef.current.fadeOut();
      }
    }),
  });

  return {
    visible: config.visible as boolean,
    intensity: config.intensity as number,
    form: config.form as EntityDebugConfig['form'],
  };
}
