// Note: this code requires... either "crypto" under node.js or in 
// a browser, this code...
//
// https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/rollups/hmac-sha256.js
//      or 
// http://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/hmac-sha256.js
//


// Using approach from 
//   http://caolanmcmahon.com/posts/writing_for_node_and_the_browser/
// To make this code useful for both node.js and browsers.
//
(function(exports){


	// auth_headers()
	//
	// Make and sign a timestamp + endpoint combo with the API secret key.
	// Provides all the extra headers required. Omit force_ts in most cases.
	//
	exports.auth_headers = function(api_key, secret, endpoint, force_ts) {
		if(!secret || !endpoint || !api_key) {
			console.error("Need key, endpoint and secret! ", api_key, secret, endpoint);

			return {};
		}

		// ignore query string stuff.
		endpoint = endpoint.split('?')[0];

		var ts = force_ts || (new Date()).toISOString(); 
		var data = endpoint + '|' + ts;

		// requires: http://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/hmac-sha256.js
		var hm;

		if(typeof CryptoJS === 'undefined') {
		  var crypto = require('crypto');
		  hm = crypto.createHmac('sha256', secret).update(data).digest('hex')
		} else {
		  hm = CryptoJS.HmacSHA256(data, secret).toString();
		}

		return { 
			'X-CK-Key': api_key, 
			'X-CK-Sign': hm,
			'X-CK-Timestamp': ts,
		};
	}

})(typeof exports === 'undefined' ? this['CK_API']={} : exports);

// EOF
