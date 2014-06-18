module.exports = {
  defaultEngine: 'ejs',

  /**
   * The default view engine can be any of:
   * https://github.com/talyssonoc/consolid8ion
   *
   * Must follow the pattern:
   *
   * name: {
   *   extension: extension
   *   lib: lib-that-renders-the-extension
   * }
   */

  engines: {
    ejs: {
      extension: 'ejs',
      lib: require('ejs')
    }
  }
};