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
    enabled: false,
    host: 'localhost',
    port: 27017,
    name: 'rhapsody',
    username: undefined,
    password: undefined
  },
  log: {
    level: 'debug',
    output: undefined,
    printStack: false,
    printLevel: true,
    time: true,
    silent: false
  }
};