'use strict';
var https = require('https');
var querystring = require('querystring');

// Tag Manager's `/hyper/tags` endpoint is unauthenticated - it's only
// gated by CORS for browser requests, which doesn't apply here since we
// call it from this server rather than from the browser. This means we
// don't need Tag Manager to allow-list our domain, nor do we need to
// share any Guardian single sign-on session with it.
function searchCommissioningDesks(tagManagerUrl, query) {
    var qs = querystring.stringify({
        query: query,
        limit: 20,
        type: 'tracking',
        subType: 'commissioningdesk'
    });

    return new Promise(function(resolve, reject) {
        https.get(tagManagerUrl + '/hyper/tags?' + qs, function(res) {
            var body = '';
            res.setEncoding('utf8');
            res.on('data', function(chunk) { body += chunk; });
            res.on('end', function() {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(
                        'Tag Manager returned ' + res.statusCode
                    ));
                    return;
                }

                try {
                    var json = JSON.parse(body);
                    var desks = (json.data || []).map(function(item) {
                        return {
                            id: item.data.path,
                            name: item.data.externalName
                        };
                    });
                    resolve(desks);
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', reject);
    });
}

module.exports = {
    searchCommissioningDesks: searchCommissioningDesks
};
