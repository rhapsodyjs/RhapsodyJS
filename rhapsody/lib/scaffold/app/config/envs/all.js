module.exports = {
  host: 'localhost',
  port: 4242,
  database: {
    enabled: false,
    host: 'localhost',
    port: 27017,
    name: 'rhapsody'
  },
  log: {
    level: 'debug',
    output: undefined,
    printStack: false,
    printLevel: true,
    time: true,
    silent: false
  },
  socket: {
    enabled: true
  }
};