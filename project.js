// Global config here... sigh
//
var CK_API_HOST = 'https://api.coinkite.com';
//var CK_API_HOST = 'http://lh:5001';
var CK_API_KEYS = {};

var app = angular.module('cc-example-module', ['mgcrea.ngStrap', 'restangular']);

app.controller('mainController', function($scope, Restangular) {

	// NOTE: This endpoint is public and does not require any API key to read.
    $scope.rates = {};
    $scope.reload_rates = function() {
      Restangular.oneUrl('public/rates').get().then(function(eps) {
          console.log("Got rate-list list ok");

          $scope.rates = eps.rates;
      });
    }
    $scope.reload_rates();

    // We will only display these crypto currencies. Comment them out to not support
    $scope.currencies = [
      { code: 'BTC', name: 'Bitcoin', sign: 'Ƀ' },
      { code: 'LTC', name: 'Litecoin', sign: 'Ł' },
      { code: 'BLK', name: 'Blackcoin', sign: 'Ѣ' },
      { code: 'XTN', name: 'Testnet3', sign: '❀' },
    ];

    // List your local fiat currencies here, in order of preference.
    $scope.fav_currencies = [ 'CAD', 'USD', 'CNY' ];

    $scope.filter_fav_currency = function(pair) {
        // some JS logic because I can't get angular to do this in the template.
        //console.log("pair = ", pair);
        return _.contains($scope.fav_currencies, pair.code);
    };

    $scope.possible_bills = [
        { label:'C$5 CAD', value: { amount: 5, cct: 'CAD', sign: 'C$'}},
        { label:'$5 USD', value: { amount: 5, cct: 'USD', sign: '$'}},
        { label:'NZ$5 NZD', value: { amount: 5, cct: 'NZD', sign: 'NZ$'}},
        { label:'€5 EUR', value: { amount: 5, cct: 'EUR', sign: '€'}},
        { label:'₩5000 KRW', value: { amount: 5000, cct: 'KRW', sign: '₩'}},
        { label:'¥100 CNY', value: { amount: 100, cct: 'CNY', sign: '¥'}},
        { label:'руб 1000', value: { amount: 1000, cct: 'RUB', sign: 'руб'}},
    ];


    // reset all state here.
    $scope.reset_all = function() {
        // these have to be picked by the user
        $scope.txn = {
            coin_type: null,
            method: null,
            dest_pubkey: null,
            dest_email: null,
            dest_phone: null,

            // what they have inserted so far
            deposit_list: [],
            active_cct: [$scope.reset_fav_cct],
        };
    };
    $scope.reset_all();

    $scope.need_qr = function() {
        return $scope.txn.method == 'qr' && !$scope.txn.dest_pubkey;
    };

    $scope.cash_ready = function() {
        // when are we ready to accept bills?
        return $scope.txn.coin_type && $scope.txn.method &&
                 ($scope.txn.method != 'qr' || $scope.txn.dest_pubkey);
    };

    $scope.can_stop = function() {
        // when are we ready to complete the transaction?
        return $scope.cash_ready() && $scope.txn.deposit_list.length;
    };

    $scope.new_pubkey = function(pk) {
        console.log("New key: ", $scope.txn.dest_pubkey);
    };

    $scope.insert_bill = function(bill) {
        // see if we can add to existing entry first.
        for(var i=0; i < $scope.txn.deposit_list.length; i++) {
            var h = $scope.txn.deposit_list[i];

            if(h.cct == bill.value.cct) {
                // match; they already have put in some of this type
                h.amount += bill.value.amount
                return;
            }
        }
        
        $scope.txn.deposit_list.push(angular.copy(bill.value));
        $scope.txn.active_cct.push(bill.value.cct);
    };

    $scope.current_quote = function() {
        if(!$scope.txn.coin_type) return;

        var tot = 0;
        var cct = $scope.txn.coin_type.code;
        var lst = $scope.txn.deposit_list;
        var pairs = $scope.rates[cct];

        for(var i=0; i < lst.length; i++) {
            var h = lst[i];
            var ex = pairs[h.cct].rate;
            tot += h.amount / ex;
            // XXX no credit for pairs we don't know how to convert!
        }

        // clear some junk bits
        if(tot > 1000) {
            tot = tot.toFixed(2);
        } else if(tot > 0.01) {
            tot = tot.toFixed(4);
        }

        return Number(tot).toFixed(8);
    };

    $scope.finalize_transaction = function() {
        $scope.reset_all()
    }

});

app.controller('CKReadCtrl', function($scope, $http, $log, Restangular)
{
	// Initial state for variables.
    $scope.auth = {
        api_key: '',
        api_secret: '',
    };

	// Try to populate keys with useful defaults... ok if this fails.
	$http({method:'GET', url:'my-keys.json'}).success(function(d, status) {
		if(status == 200) {
            if(d.host) CK_API_HOST = d.host;
            angular.extend(CK_API_KEYS, d);
			$scope.auth = d;

            $log.info("Got your keys");
		} else {
			$log.info("NOTE: You can add a JSON file in 'my-keys.json' in this directory"
                        +" to pre-fill your key values.");
		}
    });

    // Monitor the auth keys, and fetch the account list when/if they change.
    $scope.accounts_ok = false;

    // Whenever the keys change (or are set right), fetch the account
    // list as a test and also to start configuring ourselves to suit the new user's
    // account types.
    //
    $scope.$watch('auth', function(newVal, oldVal) {
        if(!newVal.api_key || !newVal.api_secret) {
            console.warn("Empty API key or secret");
            $scope.accounts_ok = false;
            return;
        }
        console.log("Watch triggers")

        Restangular.oneUrl('v1/my/accounts').get().then(function(d) {
            var accounts = d.results;

            console.log("Got account list ok: ", accounts);

            $scope.accounts_ok = true;
        });
    });
});

app.factory('myInterceptor', ['$log', function($log)
{

    // Purely for debug, and somewhat annoying.

    var myInterceptor = {
       'request': function(config) {
            $log.debug("HTTP Request: " + config.url, config);

            return config;
        },

        'response': function(response) {
            //$log.debug("HTTP Response: ", response);
            return response;
        },

        'responseError': function(response) {
            // This allows my carefully constructed JSON error
            // responses to show through!
            $log.debug("HTTP Response (Error): ", response);
			if(!response.data) {
				response.data = '{"error":"HTTP Error ' + response.status + '"}';
			}
            return response;
        }
    };

    return myInterceptor;
}]);

app.config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push('myInterceptor');
}]);


app.config(function(RestangularProvider) {
console.log("Hello?");

    RestangularProvider.setBaseUrl(CK_API_HOST);

    RestangularProvider.setFullRequestInterceptor(function(element, operation, route, url, headers, params, httpConfig) {
        console.log("Full request: ", headers, url, route);

        _.extend(headers, get_auth_headers('/' + route));

      return {
        element: element,
        params: params,
        headers: headers,
        httpConfig: httpConfig
      };
    });

    RestangularProvider.addResponseInterceptor(function(data, operation, what, url, response, deferred) {
        if(response.status != 200) {
            console.error("CK Request failed: " + response.status);
            console.error("JSON contents: ", data);
        }
        //console.log("respon interceptro: data=", data, " response=", response);

      return data;
    });


});

// CK Authorization stuff
//
function get_auth_headers(endpoint) {
    if(!CK_API_KEYS.api_secret || !CK_API_KEYS.api_key) {
        console.warn("No API key/secret defined but continuing w/o authorization headers.")
        return {};
    }

    // make the tricky parts of the auth headers
    return CK_API.auth_headers(CK_API_KEYS.api_key, CK_API_KEYS.api_secret, endpoint);
}

// EOF
