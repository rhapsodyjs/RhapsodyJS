/**
 * Use the settings from: https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
 * Except that related with logging
 */

module.exports = function socketConfig(io) {
  io.sockets.on('connection', function(socket) {
    socket.emit('heyClient', {hello: 'client'});
    socket.on('heyServer', function(data) {
      Rhapsody.log.verbose(data.hello);
    })
  });
};