// theme.ts - Ultra Cyberpunk palette. Pure black, neon green, cyan.
export const COLORS = {
  black: '#000000',
  primary: '#00FF9C',   // neon green
  secondary: '#38E8FF',  // cyan
  danger: '#FF3860',
  warning: '#FFD166',
  text: '#DFFFF7',
  textDim: '#5c8f75',
  border: '#0d2b21',
  panel: '#03140d',
};

export function statusColor(state?: string): string {
  switch (state) {
    case 'DONE':
    case 'DONE_WITH_ERRORS':
    case 'INSTALLED':
    case 'CONNECTED':
    case 'APPROVED':
    case 'HEALTHY':
      return COLORS.primary;
    case 'RUNNING':
    case 'QUEUED':
    case 'PENDING':
      return COLORS.secondary;
    case 'FAILED':
    case 'DISCONNECTED':
    case 'REVOKED':
      return COLORS.danger;
    case 'TOOL_NOT_INSTALLED':
    case 'NOT_CONFIGURED':
    case 'SKIPPED':
      return COLORS.warning;
    default:
      return COLORS.text;
  }
}
