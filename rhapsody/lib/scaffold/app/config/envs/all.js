module.exports = {
  host: 'localhost',

  http: {
    port: 4242,
    socket: true
  },

  https: {
    enabled: false,
    port: 4243,
    socket: true
  },

  methodOverride: {
    enabled: false,
    attributeName: 'newMethod'
  },

  database: {
    enabled: false,
    host: 'localhost',
    port: 27017,
    name: 'rhapsodyTests',
    username: undefined,
    password: undefined,
    mongoOptions: {}
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

    //View used when the user doesn't specify it
    mainView: 'index',

    //If must be created REST routes for models
    allowREST: true
  },

  compression: {
    enabled: true
  },

  generateClientModels: true,

  csrf: {
    enabled: false
  }
};