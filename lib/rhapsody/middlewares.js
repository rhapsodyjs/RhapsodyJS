module.exports = {
	compression: require('compression'),
	methodOverride: require('method-override'),
	bodyParser: require('body-parser'),
	multiparty: require('connect-multiparty'),
	cookieParser: require('cookie-parser'),
	session: require('express-session'),
	csurf: require('csurf'),
	cors: require('cors'),
	ajaxOnly: require('ajax-only')
};