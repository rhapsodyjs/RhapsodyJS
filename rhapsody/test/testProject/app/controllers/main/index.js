var MainController = {
  mainView: 'index',
  
  views: {

    index: 'index.html',

    login: {
      action: function(req, res) {
        res.view({
          name: 'login.hbs',
          locals: {

          }
        });
      },
      middlewares: ['not-logged'],
      customRoutes: ['/signin']
    },

    info: {
      action: function(req, res) {

        // Rhapsody.log.oneLevel('to rule them all');

        res.view({
          name: 'info.hbs',
          locals: {
            user: req.session.user
          }
        });
      },
      middlewares: ['logged']
    },

    'post:enter': function(req, res) {
      if(typeof req.body.user !== 'undefined') {
        req.session.user = req.body.user;
        res.redirect('/info');
      }
      else {
        res.send(404);
      }
    }
  }
}

module.exports = MainController;