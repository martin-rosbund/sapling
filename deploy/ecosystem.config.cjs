module.exports = {
  apps: [
    {
      name: 'sapling-backend',
      script: 'dist/main.js',
      cwd: '/var/www/sapling/current/backend',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      time: true,
      out_file: '/var/www/sapling/shared/log/pm2-backend.out.log',
      error_file: '/var/www/sapling/shared/log/pm2-backend.err.log',
      merge_logs: true,
      kill_timeout: 10000,
      listen_timeout: 10000,
    },
  ],
};
