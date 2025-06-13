declare var process: any;
declare var Buffer: any;
declare var fetch: any;
declare var require: any;
declare var module: any;
declare var console: any;

declare module 'fs' {
  export function writeFileSync(path: string, data: any, opts?: any): void;
  export function mkdirSync(path: string, opts?: any): void;
}

declare module 'path' {
  export function join(...parts: any[]): string;
}
