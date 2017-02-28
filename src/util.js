/*jshint esversion: 6 */
export function error(e) {
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

export function parseToken(token) {
	var base64Url = token.split('.')[1];
	var base64 = DanaMethodReplace("replace", DanaMethodReplace("replace", base64Url, '-', '+'), '_', '/');
	return JSON.parse(window.atob(base64));
}

function formatMessage(e) {
	// Custom
	if (e.error == 'Connection Issue') return 'Could not connect';
	if (e.error == 'Bad Request') return 'Invalid data';
	if (e.error == 'Token Expired') return 'Token Expired';
	// Standard http
	if (e.code == 500) return 'Server Error';
	if (e.code == 404) return 'Not Found';
	if (e.code == 403) return 'Forbidden';
	if (e.code == 401) return 'Unauthorized';

	return 'Unknown error';
}
