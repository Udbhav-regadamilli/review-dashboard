const { spawn } = require('child_process');
const { resolve } = require('path');
const { PostgresInstance } = require('pg-embedded');

async function main() {
  const instance = new PostgresInstance({
    port: 0,
    username: 'postgres',
    password: 'postgres',
    databaseName: 'review_db',
    persistent: false,
  });

  console.log('Starting embedded Postgres...');
  await instance.start();
  console.log('Embedded Postgres started.');

  const connectionInfo = instance.connectionInfo;
  const databaseUrl = connectionInfo.connectionString;
  console.log('Connection URL:', databaseUrl);

  try {
    await instance.createDatabase('review_db');
  } catch (error) {
    // ignore if it already exists
  }

  const databaseUrlForApp = (() => {
    const url = new URL(databaseUrl);
    url.pathname = '/review_db';
    return url.toString();
  })();

  const env = {
    ...process.env,
    DATABASE_URL: databaseUrlForApp,
    REVIEW_SOURCES:
      process.env.REVIEW_SOURCES ||
      'https://amzn.in/d/07vKnqI2,https://amzn.in/d/01qnlA6F,https://amzn.in/d/03eooMZA',
  };

  const npmCmd = 'npm';
  console.log('Running database migrations...');
  await new Promise((resolvePromise, rejectPromise) => {
    const migrate = spawn(npmCmd, ['run', 'migrate'], {
      cwd: resolve(__dirname, '..'),
      stdio: 'inherit',
      env,
      shell: true,
    });

    migrate.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(new Error(`Migration process exited with code ${code}`));
      }
    });
    migrate.on('error', rejectPromise);
  });

  console.log('Database migrations complete. Starting Next.js...');
  const dev = spawn(npmCmd, ['run', 'dev'], {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
    env,
    shell: true,
  });

  const cleanup = async () => {
    try {
      console.log('\nStopping embedded Postgres...');
      await instance.cleanup();
      console.log('Embedded Postgres stopped.');
    } catch (error) {
      console.error('Failed to stop embedded Postgres:', error);
    }
  };

  const shutdown = async (signal) => {
    try {
      if (signal) {
        console.log(`Received ${signal}, shutting down...`);
      }
      if (!dev.killed) {
        dev.kill(signal || 'SIGTERM');
      }
      await cleanup();
    } catch (error) {
      console.error('Shutdown error:', error);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', async (error) => {
    console.error('Uncaught exception in dev-local:', error);
    await shutdown('SIGTERM');
  });
  process.on('unhandledRejection', async (reason) => {
    console.error('Unhandled rejection in dev-local:', reason);
    await shutdown('SIGTERM');
  });
  process.on('exit', cleanup);

  dev.on('exit', async (code) => {
    await cleanup();
    process.exit(code);
  });
}

main().catch((error) => {
  console.error('Failed to start local dev environment:', error);
  process.exit(1);
});
