var UsersController = {
  mainView: 'index',

  views: {
    index: function(req, res) {

      var User = Rhapsody.requireModel('User');

      User.find({}, function foundUsers(err, users) {

        if(err) {
          console.log(err);
        }
        else {
          res.render(__dirname + '/views/list.ejs', {users : users});
        }

      });

    },

    show: {
      params: [':age'],

      action: function(req, res) {
        var User = Rhapsody.requireModel('User');

        User.find({age: req.params.age}, function foundUsers(err, user) {
          if(err) {
            console.log(err);
          }
          else {
            res.render(__dirname + '/views/list.ejs', {users : user});
          }
        });
      }
    },

    'insert': function(req, res) {
      var userData = {
        name: req.query.name,
        age: req.query.age
      };

      var User = Rhapsody.requireModel('User');

      var newUSer = new User(userData);
      newUSer.save(function (err) {
        if (err) {
          console.log(err);
        }
      });

      res.send(200);
    }
  }
}

module.exports = UsersController;