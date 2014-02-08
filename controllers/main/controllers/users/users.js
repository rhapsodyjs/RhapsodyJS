var UsersController = {
  views: {
    index: {
      params: [':age'],

      action: function(req, res) {
        var User = rhapsody.requireModel('User');

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

    list: function(req, res) {

      var User = rhapsody.requireModel('User');

      User.find({}, function foundUsers(err, users) {

        if(err) {
          console.log(err);
        }
        else {
          res.render(__dirname + '/views/list.ejs', {users : users});
        }

      });

    },

    'insert': function(req, res) {
      var userData = {
        name: req.query.name,
        age: req.query.age
      };

      var User = rhapsody.requireModel('User');

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