// Global type declarations for modules without type definitions

declare module 'json-logic-js' {
  export type JsonLogicRule = Record<string, unknown> | unknown[] | string | number | boolean | null;

  export type JsonLogicData = Record<string, unknown>;

  export interface JsonLogic {
    apply(rule: JsonLogicRule, data: JsonLogicData): unknown;
  }

  const jsonLogic: JsonLogic;
  export default jsonLogic;
}

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

