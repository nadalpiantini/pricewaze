declare module 'json-logic-js' {
  export type JsonLogicRule = Record<string, unknown> | unknown[] | string | number | boolean | null;

  export type JsonLogicData = Record<string, unknown>;

  export interface JsonLogic {
    apply(rule: JsonLogicRule, data: JsonLogicData): unknown;
  }

  const jsonLogic: JsonLogic;
  export default jsonLogic;
}

