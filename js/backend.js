import { CONFIG } from './config.js';

const mod = CONFIG.backend === 'mock'
  ? await import('./backend-mock.js')
  : await import('./backend-firebase.js');

export const B = mod.default;
