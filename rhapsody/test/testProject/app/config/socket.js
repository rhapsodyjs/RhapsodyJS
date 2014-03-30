/**
 * Use the settings from: https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
 * Except that related with logging
 */

module.exports = function socketConfig(io, sessionSockets) {
  // io.sockets.on('connection', function(socket) {
  //   socket.emit('heyClient', {hello: 'client'});
  //   socket.on('heyServer', function(data) {
  //     Rhapsody.log.verbose(data.hello);
  //   });
  // });

  sessionSockets.on('connection', function (err, socket, session) {
    var dataToUser;

    if(err) {
      Rhapsody.log.error(err);
    }

    if(!session.oldUser) {
      dataToUser = 'Welcome!';
      session.oldUser = true;
      session.save();
    }
    else {
      dataToUser = 'Welcome again!';
    }

    socket.emit('heyClient', {hello: dataToUser});

    socket.on('heyServer', function(data) {
      Rhapsody.log.verbose(data.hello);
    });
  });
};