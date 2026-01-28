import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Read package.json version (ES module compatible)
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
);
const appVersion = packageJson.version;

// Get git commit hash with error handling
function getGitCommitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

const buildDate = new Date().toISOString().split('T')[0];
const commitHash = getGitCommitHash();

export default defineConfig({
  server: {
    port: 9005,
    host: '0.0.0.0',
  },
  preview: {
    port: 9005,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_DATE__: JSON.stringify(buildDate),
    __COMMIT_HASH__: JSON.stringify(commitHash),
  }
});
