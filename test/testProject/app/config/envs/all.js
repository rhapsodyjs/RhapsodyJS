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
    defaultAdapter: 'mongodb'
  },
  
  log: {
    level: 'all',
    output: undefined,
    printStack: false,
    printLevel: true,
    printTime: false,
    silent: false,
    driver: undefined
  },

  routes: {
    //Controller used when access the app's root
    mainController: 'main',

    //View used when the user doesn't specify it
    mainView: 'index',

    //If must be created REST routes for models
    allowREST: true
  },

  upload: {
    enabled: true,
  },

  compression: {
    enabled: true
  },

  clientModels: {
    enabled: false,
    adapter: undefined/*,
    destination: */
  },

  csrf: {
    enabled: false
  },

  cluster: {
    enabled: false
  }
};