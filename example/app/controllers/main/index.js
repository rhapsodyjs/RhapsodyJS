var MainController = {
  mainView: 'index',
  
  views: {

    index: 'index.html',

    login: {
      action: 'login.html',
      middlewares: ['not-logged']
    },

    info: {
      action: function(req, res) {
        // console.log(require('util').inspect(req.cookies, {showHidden: true}));
        // console.log(req.cookies.sessionID);
        // console.log(req.signedCookies);

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