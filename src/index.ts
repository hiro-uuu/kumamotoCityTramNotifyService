/**
 * Kumamoto City Tram Notification Service
 *
 * This is the main entry point for local development.
 * In production (Vercel), the API routes handle requests directly.
 */

import { startPolling, stopPolling } from './services/polling.js';

async function main(): Promise<void> {
  console.log('Kumamoto City Tram Notification Service');
  console.log('======================================');

  // Check required environment variables
  const required = [
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    console.error('Please set them in .env.local or environment');
    process.exit(1);
  }

  console.log('Starting polling service...');
  startPolling(30000); // 30 second intervals

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    stopPolling();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nShutting down...');
    stopPolling();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
