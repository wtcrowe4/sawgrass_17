declare module "@mkkellogg/gaussian-splats-3d" {
  import * as THREE from "three";

  export enum SceneFormat {
    Splat = 0,
    KSplat = 1,
    Ply = 2,
    Spz = 3,
  }

  export enum LogLevel {
    None = 0,
    Error = 1,
    Warning = 2,
    Info = 3,
    Debug = 4,
  }

  export enum SceneRevealMode {
    Default = 0,
    Gradual = 1,
    Instant = 2,
  }

  export enum RenderMode {
    Always = 0,
    OnChange = 1,
    Never = 2,
  }

  export interface AddSplatSceneOptions {
    splatAlphaRemovalThreshold?: number;
    showLoadingUI?: boolean;
    position?: number[];
    rotation?: number[];
    scale?: number[];
    progressiveLoad?: boolean;
    format?: SceneFormat;
    onProgress?: (percent: number, message: string, stage: string) => void;
  }

  export interface DropInViewerOptions {
    selfDrivenMode?: boolean;
    sharedMemoryForWorkers?: boolean;
    gpuAcceleratedSort?: boolean;
    integerBasedSort?: boolean;
    halfPrecisionCovariancesOnGPU?: boolean;
    dynamicScene?: boolean;
    sceneRevealMode?: SceneRevealMode;
    antialiased?: boolean;
    focalAdjustment?: number;
    logLevel?: LogLevel;
    progressiveLoad?: boolean;
  }

  export class DropInViewer extends THREE.Group {
    constructor(options?: DropInViewerOptions);
    addSplatScene(path: string, options?: AddSplatSceneOptions): Promise<void>;
    addSplatScenes(scenes: Array<{ path: string } & AddSplatSceneOptions>): Promise<void>;
    getSplatScene(index: number): unknown;
    dispose(): Promise<void>;
  }

  export class Viewer {
    constructor(options?: Record<string, unknown>);
    addSplatScene(path: string, options?: AddSplatSceneOptions): Promise<void>;
    start(): void;
    dispose(): Promise<void>;
  }
}
