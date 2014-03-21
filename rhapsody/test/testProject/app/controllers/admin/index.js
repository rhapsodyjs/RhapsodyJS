var AdminController = {
  middlewares: ['logged', 'admin'],

  views: {
    index: 'index.html'
  }
};

module.exports = AdminController;