var MongoStore = require('connect-mongo')(Rhapsody.express);

module.exports = {
  sessionIDKey: 'sessionIdentification',
  cookiesSecret: 'rhapsody',
  sessionSecret: 'rhapsody',
  maxAge: 70000,
  sessionStore: new MongoStore({
    url: 'mongodb://localhost:27017/rhapsodySession'
  })
};