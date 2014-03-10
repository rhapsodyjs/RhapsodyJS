module.exports = function first(req, res, next) {
  console.log(req.query);
  if(req.query.first == 'first') {
    next();
  }
  else {
    res.send(404);
  }
};