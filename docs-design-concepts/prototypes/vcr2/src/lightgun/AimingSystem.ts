import { Raycaster, Vector2 } from 'three';
import type { Camera, Intersection, Object3D } from 'three';

export interface AimingTarget {
  id: string;
  object: Object3D;
  onShoot?: (intersection: Intersection) => void;
  onTarget?: () => void;
  onUntarget?: () => void;
}

export interface ShootResult {
  hit: boolean;
  targetId?: string;
  intersection?: Intersection;
  uv?: Vector2;
}

export type CursorState = 'idle' | 'targeting' | 'firing' | 'miss';

export class AimingSystem {
  private raycaster: Raycaster;
  private mouseNDC: Vector2;
  private targets: Map<string, AimingTarget>;
  private currentTargetId: string | null = null;
  private _cursorState: CursorState = 'idle';
  private onCursorStateChange?: (state: CursorState) => void;

  constructor() {
    this.raycaster = new Raycaster();
    this.mouseNDC = new Vector2(0, 0);
    this.targets = new Map();
  }

  updateMouse(
    event: MouseEvent | { clientX: number; clientY: number },
    canvas?: HTMLCanvasElement
  ): void {
    const targetCanvas = canvas ?? document.querySelector('canvas');
    if (!targetCanvas) return;

    const rect = targetCanvas.getBoundingClientRect();
    this.mouseNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  updateTouch(touch: Touch, canvas?: HTMLCanvasElement): void {
    const targetCanvas = canvas ?? document.querySelector('canvas');
    if (!targetCanvas) return;

    const rect = targetCanvas.getBoundingClientRect();
    this.mouseNDC.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
  }

  update(camera: Camera): void {
    this.raycaster.setFromCamera(this.mouseNDC, camera);

    const targetObjects = Array.from(this.targets.values()).map((t) => t.object);
    const intersects = this.raycaster.intersectObjects(targetObjects, true);

    let newTargetId: string | null = null;

    if (intersects.length > 0) {
      const hit = intersects[0];
      for (const [id, target] of this.targets) {
        if (this._isDescendant(hit.object, target.object)) {
          newTargetId = id;
          break;
        }
      }
    }

    if (newTargetId !== this.currentTargetId) {
      if (this.currentTargetId) {
        const prevTarget = this.targets.get(this.currentTargetId);
        if (prevTarget?.onUntarget) {
          prevTarget.onUntarget();
        }
      }

      this.currentTargetId = newTargetId;

      if (newTargetId) {
        const newTarget = this.targets.get(newTargetId);
        if (newTarget?.onTarget) {
          newTarget.onTarget();
        }
        this._setCursorState('targeting');
      } else {
        this._setCursorState('idle');
      }
    }
  }

  private _isDescendant(child: Object3D, parent: Object3D): boolean {
    let current: Object3D | null = child;
    while (current) {
      if (current === parent) return true;
      current = current.parent;
    }
    return false;
  }

  shoot(): ShootResult {
    if (!this.currentTargetId) {
      this._setCursorState('miss');
      setTimeout(() => this._setCursorState('idle'), 200);
      return { hit: false };
    }

    const target = this.targets.get(this.currentTargetId);
    if (!target) {
      return { hit: false };
    }

    const targetObjects = [target.object];
    const intersects = this.raycaster.intersectObjects(targetObjects, true);

    if (intersects.length > 0) {
      const intersection = intersects[0];
      if (target.onShoot) {
        target.onShoot(intersection);
      }

      this._setCursorState('firing');
      setTimeout(() => {
        this._setCursorState(this.currentTargetId ? 'targeting' : 'idle');
      }, 100);

      return {
        hit: true,
        targetId: target.id,
        intersection,
        uv: intersection.uv ?? undefined,
      };
    }

    return { hit: false };
  }

  registerTarget(target: AimingTarget): void {
    this.targets.set(target.id, target);
  }

  unregisterTarget(id: string): void {
    if (this.currentTargetId === id) {
      const target = this.targets.get(id);
      if (target?.onUntarget) {
        target.onUntarget();
      }
      this.currentTargetId = null;
      this._setCursorState('idle');
    }
    this.targets.delete(id);
  }

  get currentTarget(): AimingTarget | null {
    if (!this.currentTargetId) return null;
    return this.targets.get(this.currentTargetId) ?? null;
  }

  get cursorState(): CursorState {
    return this._cursorState;
  }

  setOnCursorStateChange(callback: (state: CursorState) => void): void {
    this.onCursorStateChange = callback;
  }

  private _setCursorState(state: CursorState): void {
    if (this._cursorState !== state) {
      this._cursorState = state;
      if (this.onCursorStateChange) {
        this.onCursorStateChange(state);
      }
    }
  }

  getRaycaster(): Raycaster {
    return this.raycaster;
  }
}
