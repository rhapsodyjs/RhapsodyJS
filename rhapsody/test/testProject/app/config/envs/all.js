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

  methodOverride: {
    enabled: false,
    attributeName: 'newMethod'
  },

  database: {
    enabled: true,
    host: 'localhost',
    port: 27017,
    name: 'rhapsodyTests',
    username: undefined,
    password: undefined
  },
  
  log: {
    level: 'all',
    output: undefined,
    printStack: false,
    printLevel: true,
    time: false,
    silent: false
  },

  routes: {
    //Controller used when access the app's root
    mainController: 'main',

    //View used when the user doen't specify it
    mainView: 'index',

    //If must be created REST routes for models
    allowREST: true
  },

  generateClientModels: true
};