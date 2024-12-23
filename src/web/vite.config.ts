// @ts-check
import { defineConfig } from 'vite'; // v4.5.0
import react from '@vitejs/plugin-react'; // v4.2.0
import { resolve } from 'path';

/**
 * Vite configuration for GameDay Platform web application
 * Optimized for both development and production environments
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  // Configure React plugin with Fast Refresh for optimal development experience
  plugins: [
    react({
      // Enable fast refresh for rapid development iterations
      fastRefresh: true,
      // Include runtime JSX transformations
      jsxRuntime: 'automatic',
      // Enable babel plugins for advanced features
      babel: {
        plugins: [
          // Add any required babel plugins here
        ],
      },
    }),
  ],

  // Module resolution configuration
  resolve: {
    // Path aliases for clean imports matching tsconfig.json
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@services': resolve(__dirname, 'src/services'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@store': resolve(__dirname, 'src/store'),
      '@assets': resolve(__dirname, 'src/assets'),
    },
  },

  // Development server configuration
  server: {
    // Development port
    port: 3000,
    // Enable host for network access
    host: true,
    // Ensure strict port usage
    strictPort: true,
    // Enable CORS for API integration
    cors: true,
    // HMR configuration
    hmr: {
      // Overlay for build errors
      overlay: true,
    },
    // Development proxy configuration
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Production build configuration
  build: {
    // Output directory for production build
    outDir: 'dist',
    // Enable source maps for debugging
    sourcemap: true,
    // Enable minification for optimal bundle size
    minify: true,
    // Target modern browsers
    target: 'es2020',
    // Enable module preloading
    modulePreload: true,
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Rollup options
    rollupOptions: {
      output: {
        // Chunk naming strategy
        manualChunks: {
          vendor: [
            'react',
            'react-dom',
            'react-router-dom',
          ],
        },
        // Asset file naming
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    // CSS configuration
    cssCodeSplit: true,
    // Report bundle size analytics
    reportCompressedSize: true,
  },

  // Preview server configuration for production builds
  preview: {
    port: 3000,
    strictPort: true,
  },

  // Optimization configuration
  optimizeDeps: {
    // Include dependencies that need optimization
    include: [
      'react',
      'react-dom',
      'react-router-dom',
    ],
  },

  // Environment variable configuration
  envPrefix: 'GAMEDAY_',

  // Enable type checking during build
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        jsx: 'react-jsx',
      },
    },
  },
});