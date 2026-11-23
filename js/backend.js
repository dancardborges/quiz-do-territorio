import { CONFIG } from './config.js?v=6';

const mod = CONFIG.backend === 'mock'
  ? await import('./backend-mock.js?v=6')
  : await import('./backend-firebase.js?v=6');

export const B = mod.default;
