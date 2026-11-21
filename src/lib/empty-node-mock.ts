// Mock empty Node modules for browser builds (prevents chunk splitting in Vite/Rollup)
export default {};
export const promises = {};
export const existsSync = () => false;
export const readFileSync = () => "";
export const writeFileSync = () => {};
