var MainController = {
  mainView: 'index',
  
  views: {

    index: 'index.html',

    login: {
      action: function(req, res) {
        res.render(__dirname + '/views/login.ejs');
      },

      customRoutes: ['/signup', '/enter']
    },

    'post:enter': function(req, res) {
      console.log(req.body);
      res.send(200);
    },

    echo: {
      params: [':text'],
      customRoutes: ['/return', '/answer'],

      action: function(req, res) {
        res.end(req.params.text);
      }
    }
    
  }
}

module.exports = MainController;