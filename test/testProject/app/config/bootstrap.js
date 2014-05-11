module.exports = function(rhapsodyApp, done) {
  rhapsodyApp.log.addLevel('oneLevel', {
    priority: Infinity,
    color: 'black',
    bg: 'white'
  });

  done();
};