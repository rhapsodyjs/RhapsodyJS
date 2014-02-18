var MainController = {
  mainView: 'index',
  
  views: {

    index: 'index.html',

    login: function(req, res) {
      res.render(__dirname + '/views/login.ejs');
    },

    'post:enter': function(req, res) {
      console.log(req.body);
      res.send(200);
    }
    
  }
}

module.exports = MainController;