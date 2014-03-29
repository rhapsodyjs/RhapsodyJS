var MongoStore = require('connect-mongo')(Rhapsody.libs.express);

module.exports = {
  sessionIDKey: 'sessionIdentification',
  cookiesSecret: 'rhapsody',
  sessionSecret: 'rhapsody',
  maxAge: 70000,
  sessionStore: new MongoStore({
    url: 'mongodb://localhost:27017/rhapsodySession'
  })
};