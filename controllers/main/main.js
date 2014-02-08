var MainController = {
  views: {

    index: 'index.html',

    login: function(req, res) {
      res.render(__dirname + '/views/login.ejs');
    }
    
  }
}

module.exports = MainController;