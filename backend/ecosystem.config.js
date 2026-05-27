module.exports = {
  apps: [
    {
      name: 'task-manager-api',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      error_file: '/var/log/pm2/task-manager-error.log',
      out_file: '/var/log/pm2/task-manager-out.log',
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};
