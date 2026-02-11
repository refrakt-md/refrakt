import { ComponentType } from "../interfaces.js";

export class DebugInfo {
  error: Error[] = [];
}

export interface DebugInfoComponent extends ComponentType<DebugInfo> {
  tag: 'section',
  properties: {
    error: 'tr',
  },
}

export class Error {
  code: string = '';
  tag: string = '';
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical' = 'debug';
  message: string = '';
}

export interface ErrorComponent extends ComponentType<Error> {
  tag: 'tr',
  properties: {
    code: 'td',
    tag: 'td',
    level: 'td',
    message: 'td',
  },
}
