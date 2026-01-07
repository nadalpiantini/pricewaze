declare module 'pannellum' {
  export interface ViewerConfig {
    type: string;
    panorama: string;
    autoLoad?: boolean;
    autoRotate?: number;
    compass?: boolean;
    [key: string]: unknown;
  }

  export interface Viewer {
    destroy(): void;
    [key: string]: unknown;
  }

  export interface Pannellum {
    viewer(container: HTMLElement, config: ViewerConfig): Viewer;
  }

  const pannellum: Pannellum;
  export default pannellum;
}

