module.exports = {
  apps: [
    {
      name: 'command-center',
      script: 'server.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
