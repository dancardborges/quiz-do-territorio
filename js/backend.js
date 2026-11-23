import { CONFIG } from './config.js?v=7';

const mod = CONFIG.backend === 'mock'
  ? await import('./backend-mock.js?v=7')
  : await import('./backend-firebase.js?v=7');

export const B = mod.default;
