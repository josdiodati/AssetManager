module.exports = {
  apps: [{
    name: 'assetmanager',
    script: '/home/assman/.nvm/versions/node/v22.22.1/bin/node',
    args: 'node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port 3000',
    cwd: '/opt/projects/assetmanager',
    env: {
      NODE_ENV: 'production',
      PORT: '3000',
      PATH: '/home/assman/.nvm/versions/node/v22.22.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    },
    exp_backoff_restart_delay: 100,
  }]
}
