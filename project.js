// Global config here... sigh
//
var CK_API_HOST = 'https://api.coinkite.com';
var CK_API_KEYS = {};

var app = angular.module('cc-example-module', ['mgcrea.ngStrap', 'restangular']);

app.controller('mainController', function($scope, Restangular) {

	// NOTE: This endpoint is public and does not require any API key to read.
/*
    var tmp = Restangular.all('public/endpoints');
    tmp.getList().then(function(eps) {
        console.log("Got endpoint list ok");

        $scope.allEndpoints = eps;
    });
*/

    $scope.currencies = [
      { code: 'BTC', name: 'Bitcoin', sign: 'Ƀ' },
      { code: 'LTC', name: 'Litecoin', sign: 'Ł' },
      { code: 'BLK', name: 'Blackcoin', sign: 'Ѣ' },
      { code: 'XTN', name: 'Testnet3', sign: '❀' },
    ];

    $scope.possible_bills = [
        { label:'C$5 CAD', value: { amount: 5, cct: 'CAD', sign: 'C$'}},
        { label:'$5 USD', value: { amount: 5, cct: 'USD', sign: '$'}},
        { label:'NZ$5 NZD', value: { amount: 5, cct: 'NZD', sign: 'NZ$'}},
        { label:'€5 EUR', value: { amount: 5, cct: 'EUR', sign: '€'}},
        { label:'₩5000 KRW', value: { amount: 5000, cct: 'KRW', sign: '₩'}},
        { label:'¥100 CHY', value: { amount: 100, cct: 'CHY', sign: '¥'}},
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
        };

        $scope.fav_cct = 'CAD';
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
        // when are we ready to complete the transaction.
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
    };

    $scope.finalize_transaction = function() {
        $scope.reset_all()
    }


});

app.controller('deliveryController', function($scope) {

  $scope.method = "qr";
  //$scope.coin_type = { cct: "btc" } ;

});

app.controller('CKReadCtrl', function($scope, $http) {

    $scope.reload = function(auth, endpoint) {
      // copy to global var, where more easily used...
      angular.extend(CK_API_KEYS, auth);
	  if(auth.host) {
		  CK_API_HOST = auth.host;
	  }

      if(!endpoint) return;

      url = CK_API_HOST + endpoint;

      $scope.busy = true;
      $scope.failed = false;
      $scope.last_url = url;
      $scope.before = performance.now()
      $scope.response_time = 'Loading...';

      $http({method:'GET', url:url, headers:get_auth_headers(endpoint)})
			.success(function(d, stat) {
                $scope.busy = false;
                $scope.last_response = d;
                $scope.response_time = ((performance.now() - $scope.before) /1000).toFixed(3) 
                                                    + ' seconds';
			}).error(function(d, stat) {
				$scope.failed = true;
                $scope.busy = false;
                $scope.last_response = '"(failed)"';
                $scope.response_time = stat + ' error';
			});
    };

	// Initial state for variables.
    $scope.auth = {
        api_key: '',
        api_secret: '',
    };
    $scope.demo = {
        endpoint: '/v1/my/self',
    };
    $scope.last_response = '';
    $scope.response_time = '';
    $scope.last_url = '';

	// Try to populate keys with useful defaults... ok if this fails.
	$http({method:'GET', url:'my-keys.json'}).success(function(d, status) {
		if(status == 200) {
			$scope.auth = d;
		} else {
			console.info(
"NOTE: You can add a JSON file in 'my-keys.json' in this directory to pre-fill your key values.");
		}
    });
});

app.factory('myInterceptor', ['$log', function($log) {

    var myInterceptor = {
       'request': function(config) {
            $log.debug("HTTP Request: ", config);

            return config;
        },

        'response': function(response) {
            $log.debug("HTTP Response: ", response);
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

    RestangularProvider.setBaseUrl(CK_API_HOST);

    RestangularProvider.setFullRequestInterceptor(function(element, operation, route, url, headers, params, httpConfig) {
        console.log("Full req: ", headers, url, route);

        _.extend(headers, get_auth_headers(route));

      return {
        element: element,
        params: params,
        headers: headers,
        httpConfig: httpConfig
      };
    });

    RestangularProvider.addResponseInterceptor(function(data, operation, what, url, response, deferred) {
      //$scope.last_json = data;
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
