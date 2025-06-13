export function toYAML(value: any, indent = 0): string {
  const pad = '  '.repeat(indent);
  if (Array.isArray(value)) {
    return value.map(v => `${pad}- ${format(v, indent + 1)}`).join('\n');
  } else if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => {
        const val = format(v, indent + 1);
        if (isComplex(v)) {
          return `${pad}${k}:\n${val}`;
        }
        return `${pad}${k}: ${val}`;
      })
      .join('\n');
  }
  return `${pad}${format(value, indent)}`;
}

function format(v: any, indent: number): string {
  if (Array.isArray(v) || (v && typeof v === 'object')) {
    return toYAML(v, indent);
  }
  if (typeof v === 'string') {
    return JSON.stringify(v);
  }
  return String(v);
}

function isComplex(v: any): boolean {
  return Array.isArray(v) || (v && typeof v === 'object');
}
