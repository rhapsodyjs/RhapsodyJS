module.exports = function notLogged(req, res, next) {

  if(typeof req.session.user === 'undefined') {
    next();
  }
  else {
    res.redirect('/info');
  }
};