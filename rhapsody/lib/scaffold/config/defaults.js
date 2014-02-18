module.exports = {
  port: 4242,
  
  routes: {
    //Controller used when access the app's root
    mainController: 'main',

    //View used when the user doen't specify it
    mainView: 'index',

    //If must be created REST routes for models
    allowREST: true
  },


  /**
   * The default view engine can be any of:
   * https://github.com/visionmedia/consolidate.js/#supported-template-engines
   */
  viewEngine: 'ejs'
};