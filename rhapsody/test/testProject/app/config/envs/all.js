module.exports = {
  host: 'localhost',
  port: 4242,
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
    time: true,
    silent: true
  },
  socket: {
    enabled: true
  }
};