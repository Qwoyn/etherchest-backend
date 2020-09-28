/*
  args:
    client: dsteem client to use for transaction broadcasting
    steem: dsteem instance for utils.
*/

module.exports = function(client, hive, prefix='') {
    return {
      json: function(username,privateKeyString,id,json,callback) {
        var key = hive.PrivateKey.fromString(privateKeyString);
  
        client.broadcast.json({
            required_auths: [],
            required_posting_auths: [username],
            id: prefix+id,
            json: JSON.stringify(json),
        }, key).then(
            result => { callback(null, result) },
            error => { callback(error, null) }
        )
      }
    }
  }