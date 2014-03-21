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
    level: 'info',
    output: undefined,
    printStack: false,
    printLevel: true,
    time: true
  },
  socket: {
    enabled: true
  }
};