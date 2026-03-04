export class DebugInfo {
  error: Error[] = [];
}

export class Error {
  code: string = '';
  tag: string = '';
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical' = 'debug';
  message: string = '';
}
