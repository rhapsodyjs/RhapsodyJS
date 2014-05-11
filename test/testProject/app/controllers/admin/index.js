var AdminController = {
  middlewares: ['logged', 'admin'],

  views: {
    index: 'index.html',

    test: {
      action: 'index.html',
      middlewares: [function(req, res, next) {
        res.redirect('http://www.google.com');
      }]
    }
  }
};

module.exports = AdminController;