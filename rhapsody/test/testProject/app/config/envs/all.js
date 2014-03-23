module.exports = {
  host: 'localhost',

  http: {
    port: 4242,
    socket: true
  },

  https: {
    enabled: true,
    port: 4243,
    socket: true
  },
  database: {
    enabled: true,
    host: 'localhost',
    port: 27017,
    name: 'rhapsodyTests'
  },
  log: {
    level: 'all',
    output: undefined,
    printStack: false,
    printLevel: true,
    time: false,
    silent: false
  }
};