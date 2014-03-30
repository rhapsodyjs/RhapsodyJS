module.exports = function logged(req, res, next) {
  if(typeof req.session.user !== 'undefined') {
    next();
  }
  else {
    res.redirect('/login');
  }
};