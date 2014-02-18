var MainController = {
  mainView: 'index',
  
  views: {

    index: function(req, res) {
    	res.send('Hello, RhapsodyJS!');
    }
    
  }
}

module.exports = MainController;