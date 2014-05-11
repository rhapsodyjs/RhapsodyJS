module.exports = {
  defaultEngine: 'ejs',

  engines: {
    ejs: {
      extension: 'ejs',
      lib: require('ejs')
    },
    
    handlebars: {
      extension: 'hbs',
      lib: require('handlebars')
    }
  }
};