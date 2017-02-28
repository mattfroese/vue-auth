/**
  * vue-auth v0.1.1
  * (c) 2017 Matt Froese
  * @license MIT
  */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.VueAuth = factory());
}(this, (function () { 'use strict';

/*jshint esversion: 6 */
function error(e) {
    var err = {};
    if (e.status !== undefined) {
        err.code = e.status;
        err.error = e.statusText;
        err.data = e.data ? e.data.errors : null;
        err.http = e;
        err.message = formatMessage(err);
        if (err.code == 401 && err.http.headers.get('X-Authentication-Location')) {
            err.redirect = err.http.headers.get('X-Authentication-Location');
        }
    } else if (typeof e == "string") {
        err.code = -1;
        err.message = e;
        err.error = e;
        err.http = null;
    } else {
        err.code = -1;
        err.message = e.message;
        err.error = e.message;
        err.http = null;
    }
    console.error("[Auth Error]", err);
    return Promise.reject(err);
}

function parseToken(token) {
    var base64Url = token.split('.')[1];
    var base64 = DanaMethodReplace("replace",DanaMethodReplace("replace",base64Url,'-', '+'),'_', '/');
    return JSON.parse(window.atob(base64));
}

function formatMessage(e) {
    // Custom
    if (e.error == 'Connection Issue') { return 'Could not connect'; }
    if (e.error == 'Bad Request') { return 'Invalid data'; }
    if (e.error == 'Token Expired') { return 'Token Expired'; }
    // Standard http
    if (e.code == 500) { return 'Server Error'; }
    if (e.code == 404) { return 'Not Found'; }
    if (e.code == 403) { return 'Forbidden'; }
    if (e.code == 401) { return 'Unauthorized'; }

    return 'Unknown error';
}

/*jshint esversion: 6 */
var auth = {
	defaults: {
		base: "/api/",
		scope: null,
		unauthorized_location: null,
		access_token: "token",
		refresh_token: "refresh",
		endpoints: {
			login: "login",
			logout: "logout",
			refresh: "refresh"
		}
	},
	install: function install(Vue, opts) {
		if( auth.installed ) {
			return;
		}
		// setup
		var vm = new Vue({
			data: {
                token_type: false,
				refresh_token: null,
                access_token: null,
                expires: null,
				user: null,
				not_before: null,
				issued_at: null,
				loading: false,
				checking: false,
				expiry_timer: null
			},
			computed: {
				expires_in: function expires_in() { return this.expires ? (this.expires*1000) - Date.now() : false }
			}
		});

		var self = Vue.prototype.$auth = vm;
		var options = Object.assign(auth.defaults, opts);

		var http = Vue.http;
		var router = opts.router;

		if( !http ) {
			console.error( "Auth requires vue-resource. Make sure you Vue.use(VueResource) before Vue.use(Auth)" );
		}
		if( !router ) {
			console.info( router, "To use with vue-router, pass it to me Vue.use(Auth< {router})" );
		} else {
			router.beforeEach(function (to,from,next) {
				var $auth = options.router.app.$auth;
				if( to.meta.auth && $auth.user === null ) {
					$auth.authenticate().then(function() {
						next();
					},function(e) {
						if (e.redirect)
							{ window.location.href = e.redirect; }
						if( options.unauthorized_location )
							{ next({ path: options.unauthorized_location }); }
					});
				} else {
					next();
				}
			});
		}

		// bind events
		window.onfocus = function(){ self.attemptRefresh(); };

		// methods
		self.uri = function(endpoint) {
	        return options.base + options.endpoints[endpoint];
	    };
        self.authenticate = function() {
			var params = {};
			if( options.scope ) { params.scope = options.scope; }
			if( options.redirect ) { params.redirect = options.redirect; }
            return self.attachRequestQuarterback( http.get(this.uri("login"),{ credentials: true, params: params}) );
        };
		self.refresh = function() {
            return self.attachRequestQuarterback( http.post(this.uri("refresh"), { token: self.refresh_token }) );
        };
		self.logout = function() {
			self.refresh_token = null;
			self.access_token = null;
			self.user = null;
			self.expires = null;
			self.issued_at = null;
			self.not_before = null;
			return Promise.resolve();
		};
		self.attachRequestQuarterback = function( i_promise ) {
			self.loading = true;
			return i_promise.then(function(r) {
				self.receivethMightyToken( r.data );
				return Promise.resolve();
			})
			.catch(function(e){
				return error(e);
			})
			.finally(function() {
				self.loading = false;
			});
		};
		self.receivethMightyToken = function( token_is_mightier ) {
			var access_token = token_is_mightier[options.access_token];
			var refresh_token = token_is_mightier[options.refresh_token];
			if( access_token == undefined ) { return error('No token received'); }
			var decoded_access_token = parseToken( access_token );
			self.access_token = access_token;
			self.user = token_is_mightier.payload;
			self.expires = decoded_access_token.exp;
			self.issued_at = decoded_access_token.iat;
			self.not_before = decoded_access_token.nbf;
			self.refresh_token = refresh_token;
			self.attemptRefreshIn(self.expires_in-30000);
		};

		self.attemptRefreshIn = function( ms ) {
			clearTimeout(self.expiry_timer);
			self.expiry_timer = setTimeout(function() {
				self.attemptRefresh();
			}, ms);
		};
		self.attemptRefresh = function() {
			var expires_in = (self.expires * 1000) - Date.now();

			console.info( "attemptRefresh" );
			console.info( new Date() );
			console.info( "Expires in:", expires_in );
			console.info( "Refresh Token:", self.refresh_token ? "set": "not set" );

			if( self.refresh_token && expires_in <= 300000 ) {
				self.authenticate().catch(function(e) {
					clearInterval(self.expiry_timer);
				});
			}
		};
    }
};

return auth;

})));
