var steem = require('dsteem');
var steemjs = require('steem-js-patched');
var steemState = require('./processor');
var steemTransact = require('steem-transact');
var fs = require('fs');
const cors = require('cors');
const express = require('express')
const ENV = process.env;
const maxEx = process.max_extentions || 8;
const IPFS = require('ipfs-http-client');
const ipfs = new IPFS({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https'
});

/*  const init holds the initial state of a user in the form of a json 
    as shown in the example.

        const init: {
            "delegations": {
                "delegator": string;
                "vests": number;
                "available": number;
                "used": number;
            }[];
            "kudos": {};
            "stats": {
                "vs": number;
                "dust": number;
                "time": number;
                "offsets": {
                    "a": number;
                    "b": number;
                    "c": number;
                    "d": number;
                    "e": number;
                    "f": number;
                };
                ... 5 more ...;
                "gardeners": number;
            };
            ... 8 more ...;
            "cs": {
                 ...;
            };
        }

*/
const init = require('./state');

const app = express();
const port = ENV.PORT || 3000;
const wkey = ENV.wkey;
const skey = steem.PrivateKey.from(ENV.skey);
const streamname = ENV.streamname;

app.use(cors());

/*plot info from state.js by plot number
            {
            "owner": "etherchest",
            "strain": "",
            "xp": 0,
            "care": [
                [
                    39562272,
                    "watered"
                ],
                [
                    39533519,
                    "watered"
                ],
                [
                    39504770,
                    "watered",
                    "c"
                ]
            ],
            "aff": [],
            "stage": -1,
            "substage": 0,
            "traits": [],
            "terps": [],
            "id": "a10"
            }
*/
app.get('/p/:addr', (req, res, next) => {
    let addr = req.params.addr
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(state.land[addr], null, 3))
});

//shows a log 
app.get('/logs', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(state.cs, null, 3))
});

/*detailed list of seeds a user owns from state.js by username\
        [
        {
            "owner": "etherchest",
            "strain": "",
            "xp": 0,
            "care": [
                [
                    39562272,
                    "watered"
                ],
                [
                    39533519,
                    "watered"
                ],
                [
                    39504770,
                    "watered",
                    "c"
                ]
            ],
            "aff": [],
            "stage": -1,
            "substage": 0,
            "traits": [],
            "terps": [],
            "id": "a10"
        },
        {
            "owner": "etherchest",
            "strain": "hk",
            "xp": 2250,
            "care": [
                [
                    39562272,
                    "watered"
                ],
                [
                    39533519,
                    "watered",
                    "c"
                ],
                [
                    39504770,
                    "watered",
                    "c"
                ]
            ],
            "aff": [],
            "planted": 33012618,
            "stage": 5,
            "substage": 3,
            "id": "c46",
            "sex": null
        },
        {
            "owner": "etherchest",
            "strain": "mis",
            "xp": 1,
            "care": [
                [
                    39562272,
                    "watered"
                ],
                [
                    39533519,
                    "watered",
                    "c"
                ],
                [
                    39445948,
                    "watered",
                    "c"
                ]
            ],
            "aff": [],
            "planted": 35387927,
            "stage": 5,
            "substage": 1,
            "id": "a77",
            "sex": null
        },
        "a100"
        ]
*/
app.get('/a/:user', (req, res, next) => {
    let user = req.params.user, arr = []
    res.setHeader('Content-Type', 'application/json');
    if(state.users[user]){
        for (var i = 0 ; i < state.users[user].addrs.length ; i++){
            arr.push(state.users[user].addrs[i])
        }
    }
    for ( var i = 0 ; i < arr.length ; i++){
        insert = ''
        var insert = state.land[arr[i]]
        if(insert){
            insert.id = arr[i]
            if(insert.care.length>3){insert.care.splice(3,insert.care.length-3)}
            if(insert.aff.length>3){insert.aff.splice(3,insert.aff.length-3)}
            arr.splice(i,1,insert)
        }
    }
    res.send(JSON.stringify(arr, null, 3))
});

//overal game stats i.e. number of gardeners, number of plants available, seed prices, land price, weather info
//at each location such as mexico or jamaica etc.
app.get('/stats', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    Object.keys(state.users).length
    var ret = state.stats
    ret.gardeners = Object.keys(state.users).length
    res.send(JSON.stringify(ret, null, 3))
});

//entire state.json output
app.get('/', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(state, null, 3))
});

//shows seeds by user
app.get('/seeds/:user', (req, res, next) => {
    let user = req.params.user, arr = []
    res.setHeader('Content-Type', 'application/json');
    if(state.users[user]){
        for (var i = 0 ; i < state.users[user].seeds.length ; i++){
            arr.push(state.users[user].seeds[i])
        }
    }
    res.send(JSON.stringify(arr, null, 3))
});

//shows pollen by user
app.get('/pollen/:user', (req, res, next) => {
    let user = req.params.user, arr = []
    res.setHeader('Content-Type', 'application/json');
    if(state.users[user]){
        for (var i = 0 ; i < state.users[user].pollen.length ; i++){
            arr.push(state.users[user].pollen[i])
        }
    }
    res.send(JSON.stringify(arr, null, 3))
});

//shows buds by user
app.get('/buds/:user', (req, res, next) => {
    let user = req.params.user, arr = []
    res.setHeader('Content-Type', 'application/json');
    if(state.users[user]){
        for (var i = 0 ; i < state.users[user].buds.length ; i++){
            arr.push(state.users[user].buds[i])
        }
    }
    res.send(JSON.stringify(arr, null, 3))
});

//post payouts in que
app.get('/refunds', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
        refunds: state.refund,
        bal: state.bal
    }, null, 3))
});

/*plot and seed information by user
        {
        "addrs": [
            "a10",
            "c46",
            "a77",
            "a100"
        ],
        "seeds": [
            {
                "strain": "kbr",
                "xp": 2250,
                "traits": [
                    "beta"
                ]
            },
            {
                "strain": "kbr",
                "xp": 2250,
                "traits": [
                    "beta"
                ]
            },
            {
                "xp": 50
            }
        ],
        "inv": [],
        "stats": [],
        "v": 0
        }

*/
app.get('/u/:user', (req, res, next) => {
    let user = req.params.user
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(state.users[user], null, 3))
});

/*delegation information by user
{
   "delegator": "etherchest",
   "vests": 4900485891391,
   "available": 123,
   "used": 2
}
*/
app.get('/delegation/:user', (req, res, next) => {
    let user = req.params.user
    var op = {}
    for(i=0;i<state.delegations.length;i++){
        if(state.delegations[i].delegator == user){
            op = state.delegations[i]
            break;
        }
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(op, null, 3))
});

app.listen(port, () => console.log(`etherchest token API listening on port ${port}!`))
var state;
var startingBlock = ENV.STARTINGBLOCK || 47262000; //GENESIS BLOCK
const username = ENV.ACCOUNT || 'etherchest'; //account with all the SP
const key = steem.PrivateKey.from(ENV.KEY); //active key for account
const sh = ENV.sh || '';
const ago = ENV.ago || 47262000;
const prefix = ENV.PREFIX || 'etherchest_'; // part of custom json visible on the blockchain during watering etc..
const clientURL = ENV.APIURL || 'https://api.openhive.network' // can be changed to another node
var client = new steem.Client(clientURL);
var processor;
var recents = [];
const transactor = steemTransact(client, steem, prefix);

/****ISSUE****/
//I think this is where the app can get the hash from etherchest_report that is saved in state.js and use it
//to start the app.  this should prevent the app having to start from GENESIS BLOCK
steemjs.api.getAccountHistory(username, -1, 100, function(err, result) {
  if (err){
    console.log(err)
    startWith(sh)
  } else {
    let ebus = result.filter( tx => tx[1].op[1].id === 'etherchest_report' )
    for(i=ebus.length -1; i>=0; i--){
      if(JSON.parse(ebus[i][1].op[1].json).stateHash !== null)recents.push(JSON.parse(ebus[i][1].op[1].json).stateHash)
    }
    const mostRecent = recents.shift()
    console.log('starting properly')
    console.log(sh)
    console.log(mostRecent)
    startWith(mostRecent)
  }
});

//assigns kudos to user. kudos determine who has properly cared for their plants and 
//increments kudos accordingly
function kudo(user) {
    console.log('Kudos: ' + user)
    if (!state.kudos[user]) {
        state.kudos[user] = 1
    } else {
        state.kudos[user]++
    }
}

/****ISSUE****/
function startWith(hash) {
    if (hash) {
        console.log(`Attempting to start from IPFS save state ${hash}`);
        ipfs.cat(hash, (err, file) => {
            if (!err) {
                var data = JSON.parse(file.toString())
                startingBlock = data[0]
                if (startingBlock == ago){startWith(hash)}
                else {
                state = JSON.parse(data[1]);
                startApp();
                }
            } else {
                const mostRecent = recents.shift()
                console.log('Attempting start from:'+mostRecent)
                startWith(mostRecent)
            }
        });
    } else {
        console.log('Didnt start with hash')
        state = init
        startApp()
    }
}

function startApp() {
  if(state.cs == null) {
    state.cs = {}
  }
    processor = steemState(client, steem, startingBlock, 10, prefix);


    processor.onBlock(function(num, block) {
        if (num % 125 === 0 && state.refund.length && processor.isStreaming() || processor.isStreaming() && state.refund.length > 60) {
            if (state.refund[0].length == 4) {
                bot[state.refund[0][0]].call(this, state.refund[0][1], state.refund[0][2], state.refund[0][3])
            } else if (state.refund[0].length == 3){
                bot[state.refund[0][0]].call(this, state.refund[0][1], state.refund[0][2])
            } else if (state.refund[0].length == 2) {
                var op = true, bens = false
                try {
                    if (state.refund[1][1] == 'comment_options') op = false
                    if (state.refund[1][1].extentions[0][1].beneficiaries.length) bens = true
                } catch (e) {
                    console.log('not enough players', e.message)
                }
                if(op || bens){bot[state.refund[0][0]].call(this, state.refund[0][1])} else {
                    state.refund.shift()
                }
            }
        }
        if (num % 100 === 0 && !processor.isStreaming()) {
            if(!state.news.e)state.news.e=[]
            client.database.getDynamicGlobalProperties().then(function(result) {
                console.log('At block', num, 'with', result.head_block_number - num, 'left until real-time.')
            });
        }

        if (num % 1000 === 0 && processor.isStreaming()) {
            if(!state.blacklist)state.blacklist={}
            ipfsSaveState(num, JSON.stringify(state))
        }

        if (num % 28800 === 20000 && state.payday.length) {
            for (var item in state.cs){
              if(item.split(':')[0] < num - 28800 || item.split(':')[0] == 'undefined'){
                delete state.cs[item]
              }
            }
            state.payday[0] = sortExtentions(state.payday[0],'account')
        var body = `\n`
        var footer = `\n`  //edits
            if (state.news.h.length > 0){
                body = body + state.news.h[0] + footer ;state.news.h.shift();
            } else {
                body = body + footer
            }
            body = body + listBens(state.payday[0])
            state.payday.shift()
    }
        if (num % 28800 === 0) {
            var d = parseInt(state.bal.c / 4)
            state.bal.r += state.bal.c
            if (d) {
                state.refund.push(['xfer', 'etherchest', parseInt(4 * d), 'Funds'])
                state.bal.c -= d * 4
                d = parseInt(state.bal.c / 5) * 2
                //state.refund.push(['xfer', 'etherchest-chest', state.bal.c, 'Warchest'])
                state.bal.c = 0
                state.refund.push(['power', username, state.bal.b, 'Power to the people!'])
            }
    }
  })

//----------------------------------------------------------------------------------------
//
//===========================================
//                                          |
//         ****etherchest Market****         |
//                                          |
//===========================================


//---------posting sales-----------//
// https://beta.steemconnect.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22etherchest%22%5D&id=etherchest_market_post_seed&json=%7B%22price%22%3A5000,%22seedPosted%22%3A%5B%22mis%22%5D%7D
processor.on('market_post_diamond', function(json, from) {
    let postedSeed = json.seedPosted,
        seednames = ''

        seednames += `${postedSeed}`;

        try {
            if (state.users[from].seeds[0][seednames].owner === from && state.users[from].seeds[0][seednames].forSale === false) {

               /* // add seed to market
                const postedToMarket = {
                    price:  json.price,
                    posted: json.block_num
                }
                state.users[from].seeds[0][seednames].push(postedToMarket);*/

                // set price and when it was posted
                state.users[from].seeds[0][seednames].price = json.price;
                state.users[from].seeds[0][seednames].datePosted = json.block_num;

                // set posted seed forSale to true in users inventory
                state.users[from].seeds[0][seednames].forSale = true;

            }
        } catch (e){
            state.cs[`${json.block_num}:${from}`] = `${from} can't post what is not theirs`
        }

    state.cs[`${json.block_num}:${from}`] = `${from} succesfully posted a ${json.seedPosted} seed for sale for ${json.price / 1000} STEEM`
});

processor.on('market_post_sapphire', function(json, from) {
    let postedPollen = json.pollenPosted,
        pollennames = ''

        pollennames += `${postedPollen}`;

        try {
            if (state.users[from].pollen[0][pollennames].owner === from && state.users[from].pollen[0][pollennames].forSale === false) {

                // add pollen to market
                const postedToMarket = {
                    [from]: [
                        {
                        [postedPollen]: [
                            {
                                price:  json.price,
                                posted: json.block_num
                            }
                        ]
                        }
                    ]
                }
                state.market.pollen.push(postedToMarket);

                // set posted pollen forSale to true in users inventory
                state.users[from].pollen[0][pollennames].forSale = true;

            }
        } catch (e){
            state.cs[`${json.block_num}:${from}`] = `${from} can't post what is not theirs`
        }

    state.cs[`${json.block_num}:${from}`] = `${from} succesfully posted ${json.pollenPosted} pollen for sale for ${json.price / 1000} STEEM`
}); 

processor.on('market_post_emerald', function(json, from) {
    let postedBud = json.budPosted,
        budnames = ''

        budnames += `${postedBud}`;

        try {
            if (state.users[from].buds[0][budnames].owner === from && state.users[from].buds[0][budnames].forSale === false) {

                // add bud to market
                const postedToMarket = {
                    [from]: [
                        {
                        [postedBud]: [
                            {
                                price:  json.price,
                                posted: json.block_num
                            }
                        ]
                        }
                    ]
                }
                state.market.buds.push(postedToMarket);

                // set posted bud forSale to true in users inventory
                state.users[from].buds[0][budnames].forSale = true;

            }
        } catch (e){
            state.cs[`${json.block_num}:${from}`] = `${from} can't post what is not theirs`
        }

    state.cs[`${json.block_num}:${from}`] = `${from} succesfully posted a ${json.budPosted} bud for sale for ${json.price / 1000} STEEM`
});

processor.on('market_post_ruby', function(json, from) {
    let postedBud = json.budPosted,
        budnames = ''

        budnames += `${postedBud}`;

        try {
            if (state.users[from].buds[0][budnames].owner === from && state.users[from].buds[0][budnames].forSale === false) {

                // add bud to market
                const postedToMarket = {
                    [from]: [
                        {
                        [postedBud]: [
                            {
                                price:  json.price,
                                posted: json.block_num
                            }
                        ]
                        }
                    ]
                }
                state.market.buds.push(postedToMarket);

                // set posted bud forSale to true in users inventory
                state.users[from].buds[0][budnames].forSale = true;

            }
        } catch (e){
            state.cs[`${json.block_num}:${from}`] = `${from} can't post what is not theirs`
        }

    state.cs[`${json.block_num}:${from}`] = `${from} succesfully posted a ${json.budPosted} bud for sale for ${json.price / 1000} STEEM`
});

//---------cancel sales-----------//
// https://beta.steemconnect.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22etherchest%22%5D&id=etherchest_market_cancel_seed&json=%7B%22seedToCancel%22%3A%5B%22mis%22%5D%7D
processor.on('market_cancel_diamond', function(json, from) {
    let cancelSeed = json.seedToCancel,
        seednames = ''

        seednames += `${cancelSeed}`;
        
        var seed=''

        try {
            if (state.users[from].seeds[0][seednames].owner === from && state.users[from].seeds[0][seednames].forSale === true) {

                // reset price and posted time to 0
                state.users[from].seeds[0][seednames].price = 0;
                state.users[from].seeds[0][seednames].datePosted = 0;

                // set canceled seed forSale to false in users inventory
                state.users[from].seeds[0][seednames].forSale = false;

            }
        } catch (e){
            state.cs[`${json.block_num}:${from}`] = `${from} can't cancel what is not theirs`
        }

    state.cs[`${json.block_num}:${from}`] = `${from} succesfully canceled a ${json.seedToCancel} seed sale.`
});

processor.on('market_cancel_sapphire', function(json, from) {
    let pollen = json.pollen,
        pollennames = ''
        try {
        for (var i = 0; i < pollen.length; i++) {
            try {
            if (state.users.from[pollen[i]].owner === from) {
                state.users.from[pollen[i]].forSale = 0;
                pollennames += `${pollen[i]} `
            }
            } catch (e){
            state.cs[`${json.block_num}:${from}`] = `${from} can't post what is not theirs`
            }
        }
        } catch {
            (console.log(from + ' tried to post ' + pollennames +' pollen for sale but an error occured'))
        }
    state.cs[`${json.block_num}:${from}`] = `${from} succesfully posted ${pollennames} pollen for sale`
});

processor.on('market_cancel_emerald', function(json, from) {
    let buds = json.buds,
        budNames = ''
        try {
        for (var i = 0; i < buds.length; i++) {
            try {
            if (state.users.from[buds[i]].owner === from) {
                state.users.from[buds[i]].forSale = 0;
                budNames += `${buds[i]} `
            }
            } catch (e){
            state.cs[`${json.block_num}:${from}`] = `${from} can't post what is not theirs`
            }
        }
        } catch {
            (console.log(from + ' tried to post a ' + budNames +' bud for sale but an error occured'))
        }
    state.cs[`${json.block_num}:${from}`] = `${from} succesfully posted a ${budNames} bud for sale`
});

processor.on('market_cancel_ruby', function(json, from) {
    let buds = json.buds,
        budNames = ''
        try {
        for (var i = 0; i < buds.length; i++) {
            try {
            if (state.users.from[buds[i]].owner === from) {
                state.users.from[buds[i]].forSale = 0;
                budNames += `${buds[i]} `
            }
            } catch (e){
            state.cs[`${json.block_num}:${from}`] = `${from} can't post what is not theirs`
            }
        }
        } catch {
            (console.log(from + ' tried to post a ' + budNames +' bud for sale but an error occured'))
        }
    state.cs[`${json.block_num}:${from}`] = `${from} succesfully posted a ${budNames} bud for sale`
});

//--------purchasing----------//
// found in transfer

//---------------------End Market---------------------------------------------------------

    
    //search for etherchest_breeder_name from user on blockchain since genesis
    //steemconnect link
    //https://beta.steemconnect.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22USERNAME%22%5D&id=etherchest_breeder_name&json=%7B%22breeder%22%3A%5B%22Willie%22%5D%7D
    processor.on('staker_name', function(json, from) {
        let breeder = json.breeder,
            breederName = ''
            try {
                for (var i = 0; i < 1; i++) {
                        state.users[from].breeder = breeder[i];
                        breederName += `${breeder[i]}`
                    state.cs[`${json.block_num}:${from}`] = `${from} can't change another users name`
                } 
            } catch {
                (console.log(from + ' tried to change their breeder name to ' + breederName + ' but an error occured'))
            }
        
        state.cs[`${json.block_num}:${from}`] = `${from} changed their breeder name to ${breederName}`
    });

    //search for etherchest_farmer_type from user on blockchain since genesis
    //steemconnect link
    //https://beta.steemconnect.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22USERNAME%22%5D&id=etherchest_farmer_type&json=%7B%22breeder%22%3A%5B%22TYPE%22%5D%7D
    processor.on('hero_type', function(json, from) {
        let farmer = json.farmer,
            farmerType = 1
            try {
                for (var i = 0; i < 1; i++) {
                        state.users[from].farmer = farmer[i];
                        farmerType += farmer[i]
                    state.cs[`${json.block_num}:${from}`] = `${from} can't change another users name`
                }
             } catch {
            (console.log(from + ' tried to change their farmyer type to ' + farmerType + ' but an error occured'))
        }
        //state.users[from].stats.unshift([processor.getCurrentBlockNumber(), 'changed_farmer_type']);

        state.cs[`${json.block_num}:${from}`] = `${from} changed their breeder name to ${farmerType}`
    });

    //search for etherchest_add_friend from user on blockchain since genesis
    //steemconnect link
    //https://beta.steemconnect.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22etherchest%22%5D&id=etherchest_add_friend&json=%7B%22friend%22%3A%5B%22jonyoudyer%22%5D%7D
    processor.on('add_friend', function(json, from) {
        let friend = json.friend,
            friendName = ''
            try {
            for (var i = 0; i < 1; i++) {
                friendName += friend[i]

                var friends = {
                    name: friend,
                    alliance: state.users[friend].alliance,
                    addedOn: json.block_num,
                }

                state.users[from].friends.push(friends)
                //state.users[from].stats.unshift([processor.getCurrentBlockNumber(), 'added_friend']);

                state.cs[`${json.block_num}:${from}`] = `${from} can't change another users friend list`
            }
        } catch {
            (console.log(from + ' tried to add ' + friendName + ' as a friend but an error occured'))
        }

        state.cs[`${json.block_num}:${from}`] = `${from} added ${friendName} as a friend`
    });

    //search for etherchest_remove_friend from user on blockchain since genesis
    //steemconnect link
    //https://beta.steemconnect.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22USERNAME%22%5D&id=etherchest_join_alliance&json=%7B%22alliance%22%3A%5B%22NAMEOFALLIANCE%22%5D%7D
    processor.on('remove_friend', function(json, from) {
        let friend = json.friend,
            friendName = ''
            try{
                for (var i = 0; i < 1; i++) {
                    friendName += json.friend

                    var friends = ''

                        try{
                            for (var i = 0;i < state.users[from].friends.length; i++) {
                                if(state.users[from].pollen[i].strain == json.friends) {
                                    friends=state.users[from].friends.splice(i, 1)[0];
                                    break;
                                }
                            }
                        } catch (e) {}
                        
                    state.cs[`${json.block_num}:${from}`] = `${from} can't change another users friend list`
                }
            } catch {
                (console.log(from + ' tried to remove ' + friendName + ' as a friend but an error occured'))    }

        state.cs[`${json.block_num}:${from}`] = `${from} removed ${friendName} as a friend`
    });

    //****ISSUE****//
    //search for etherchest_join_alliance from user on blockchain since genesis
    //steemconnect link
    //https://beta.steemconnect.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22USERNAME%22%5D&id=etherchest_join_alliance&json=%7B%22alliance%22%3A%5B%22NAMEOFALLIANCE%22%5D%7D
   processor.on('join_guild', function(json, from) {
        let alliance = json.alliance,
            allianceName = ''
            try {
        for (var i = 0; i < 1; i++) {
                state.users[from].alliance = alliance[i];
                allianceName += alliance[i]

                try{
                    for (var i = 0; i < state.users[from].alliance.length; i++){
                        var myAlliance = {
                            alliance: json.alliance
                        }
                        
                        if(state.users[from].alliance != json.alliance){state.users[from].alliance = myAlliance;break;}
                        
                        var newMember ={
                            memberNames: [json.from]
                        }
                        state.stats.alliances[alliance].members++;
                        state.stats.alliances[alliance].push(newMember);
                        break;
                    }
                } catch (e) {}

            state.cs[`${json.block_num}:${from}`] = `${from} can't change another users alliance`
        }
    } catch {
        (console.log(from + ' tried to join the ' + allianceName + ' alliance but an error occured'))
    }
    state.cs[`${json.block_num}:${from}`] = `${from} changed their alliance to ${allianceName}`
    });

    //search for etherchest_alliance from user on blockchain since genesis
    //steemconnect link
    //https://beta.steemconnect.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22USERNAME%22%5D&id=etherchest_create_alliance&json=%7B%22newAlliance%22%3A%5B%22NAMEOFALLIANCE%22%5D%7D
    processor.on('create_guild', function(json, from) {
        let newAlliance = json.newAlliance,
            newAllianceName = ''
        for (var i = 0; i < 1; i++) {
                newAllianceName += newAlliance[i]
                var allianceState = {
                    name: newAlliance,
                    founder: from,
                    members: 1,
                    memberNames: [from],
                }
                state.stats.alliances.push(allianceState)
                //state.users[from].stats.unshift([processor.getCurrentBlockNumber(), 'created_alliance']);

            state.cs[`${json.block_num}:${from}`] = `${from} can't create an alliance`
        }
        state.cs[`${json.block_num}:${from}`] = `${from} created alliance named ${newAllianceName}`
    });

/*
    processor.on('return', function(json, from) {
        let lands = json.lands,
            landnames = ''
        for (var i = 0; i < lands.length; i++) {
            if (state.land[lands[i]].owner == from) {
                delete state.land[lands[i]];
                state.lands.forSale.push(lands[i]);
                state.refund.push(['xfer', from, state.stats.prices.purchase.land, `Returned ${lands[i]}`]);
                plantnames += `${plants[i]} `
            }
        }
        console.log(`${from} returned ${landnames}`)
    });
*/
    processor.on('redeem', function(j, f) {
        state.cs[`${j.block_num}:${f}`] = `Redeem Op:${f} -> ${j}`
        if (state.users[f]){if (state.users[f].v && state.users[f].v > 0) {
            state.users[f].v--
            let type = j.type || ''
            if (state.stats.supply.strains.indexOf(type) < 0) type = state.stats.supply.strains[state.users.length % state.stats.supply.strains.length]
            var seed = {
                strain: type,
                xp: 50
            }
            state.users[f].seeds.push(seed)
        }}
    });

    processor.on('adjust', function(json, from) {
        if (from == username && json.dust > 1) state.stats.dust = json.dust
        if (from == username && json.time > 1) state.stats.time = json.time
    });

    processor.on('report', function(json, from) {
        try{for (var i = 0; i < state.refund.length; i++) {
            if (state.refund[i][2].block == json.block) state.refund.splice(i, 1)
        }}catch(e){
            console.log('Reports not being made', e.message)
        }
    });

    processor.on('grant', function(json, from) {
        if(from=='etherchest'){state.users[json.to].v = 1}
    });

    //checks for etherchest_give_diamond and allows users to send each other seeds
    processor.on('give_diamond', function(json, from) {
        var seed=''
        if(json.to && json.to.length > 2){
          try{
              for (var i = 0;i < state.users[from].seeds.length; i++){
                  if (json.seed){
                    if(state.users[from].seeds[i].strain === json.seed){
                      state.users[from].seeds[i].owner = json.to;
                      seed=state.users[from].seeds.splice(i, 1)[0]
                      break
                    }
                  } 
              }
          } catch (e) {}
          if (seed) {
              if (!state.users[json.to]) {
                state.users[json.to] = {
                  addrs: [],
                  seeds: [seed],
                  buds: [],
                  pollen: [],
                  breeder: "",
                  farmer: farmer,
                  alliance: "",
                  friends: [],
                  inv: [],
                  seeds: [],
                  pollen: [],
                  buds: [],
                  kief: [],
                  bubblehash: [],
                  oil: [],
                  edibles: [],
                  joints: [],
                  blunts: [],
                  moonrocks: [],
                  dippedjoints: [],
                  cannagars: [],
                  kiefbox: 0,
                  vacoven: 0,
                  bubblebags: 0,
                  browniemix: 0,
                  stats: [],
                  traits:[],
                  terps:[],
                  v: 0
                }
              } else {
                  state.users[json.to].seeds.push(seed)
              }
              state.cs[`${json.block_num}:${from}`] = `${from} sent a ${seed.xp} xp ${seed.strain} to ${json.to}`
          } else {
              state.cs[`${json.block_num}:${from}`] = `${from} doesn't own that seed`
          }
        }
    });

    //checks for etherchest_give_diamond and allows users to send each other seeds
    processor.on('give_emerald', function(json, from) {
        var seed=''
        if(json.to && json.to.length > 2){
          try{
              for (var i = 0;i < state.users[from].seeds.length; i++){
                  if (json.seed){
                    if(state.users[from].seeds[i].strain === json.seed){
                      state.users[from].seeds[i].owner = json.to;
                      seed=state.users[from].seeds.splice(i, 1)[0]
                      break
                    }
                  } 
              }
          } catch (e) {}
          if (seed) {
              if (!state.users[json.to]) {
                state.users[json.to] = {
                  addrs: [],
                  seeds: [seed],
                  buds: [],
                  pollen: [],
                  breeder: "",
                  farmer: farmer,
                  alliance: "",
                  friends: [],
                  inv: [],
                  seeds: [],
                  pollen: [],
                  buds: [],
                  kief: [],
                  bubblehash: [],
                  oil: [],
                  edibles: [],
                  joints: [],
                  blunts: [],
                  moonrocks: [],
                  dippedjoints: [],
                  cannagars: [],
                  kiefbox: 0,
                  vacoven: 0,
                  bubblebags: 0,
                  browniemix: 0,
                  stats: [],
                  traits:[],
                  terps:[],
                  v: 0
                }
              } else {
                  state.users[json.to].seeds.push(seed)
              }
              state.cs[`${json.block_num}:${from}`] = `${from} sent a ${seed.xp} xp ${seed.strain} to ${json.to}`
          } else {
              state.cs[`${json.block_num}:${from}`] = `${from} doesn't own that seed`
          }
        }
    });

    //checks for json etherchest_give_pollen and allows users to send each other pollen
    processor.on('give_sapphire', function(json, from) {
        var pollen = ''
        if(json.to && json.to.length > 2){
          try{
              for (var i = 0;i < state.users[from].pollen.length; i++){
                  if (json.qual){
                    if(state.users[from].pollen[i].strain == json.pollen && state.users[from].pollen[i].xp == json.qual){
                      state.users[from].pollen[i].owner = json.to;
                      pollen = state.users[from].pollen.splice(i, 1)[0]
                      break
                    }
                  } else if(state.users[from].pollen[i].strain === json.pollen){
                    state.users[from].pollen[i].owner = json.to;
                    pollen = state.users[from].pollen.splice(i, 1)[0]
                    break
                  }
              }
          } catch (e) {}
          if (pollen) {
              if (!state.users[json.to]) {
                state.users[json.to] = {
                  addrs: [],
                  seeds: [],
                  buds: [],
                  pollen: [pollen],
                  breeder: breeder,
                  farmer: farmer,
                  alliance: "",
                  friends: [],
                  inv: [],
                  seeds: [],
                  pollen: [],
                  buds: [],
                  kief: [],
                  bubblehash: [],
                  oil: [],
                  edibles: [],
                  joints: [],
                  blunts: [],
                  moonrocks: [],
                  dippedjoints: [],
                  cannagars: [],
                  kiefbox: 0,
                  vacoven: 0,
                  bubblebags: 0,
                  browniemix: 0,
                  stats: [],
                  traits:[],
                  terps:[],
                  v: 0
                }
              } else {
                  state.users[json.to].pollen.push(pollen)
                  
              }
              state.cs[`${json.block_num}:${from}`] = `${from} sent ${pollen.strain} pollen to ${json.to}`
          } else {
              state.cs[`${json.block_num}:${from}`] = `${from} doesn't own that pollen`
          }
        }
    });

    
   //checks for json etherchest_give_buds and allows users to send each other buds
    processor.on('give_ruby', function(json, from) {
        var bud = ''
        if(json.to && json.to.length > 2){
          try{
              for (var i = 0;i < state.users[from].buds.length; i++){
                  if(state.users[from].buds[i].strain == json.buds){
                    state.users[from].buds[i].owner = json.to;
                    bud = state.users[from].buds.splice(i, 1)[0]
                    break
                  }
              }
          } catch (e) {}
          if (bud) {
              if (!state.users[json.to]) {
                state.users[json.to] = {
                  addrs: [],
                  seeds: [],
                  pollen: [],
                  buds: [bud],
                  breeder: breeder,
                  farmer: farmer,
                  alliance: "",
                  friends: [],
                  inv: [],
                  seeds: [],
                  pollen: [],
                  buds: [],
                  kief: [],
                  bubblehash: [],
                  oil: [],
                  edibles: [],
                  joints: [],
                  blunts: [],
                  moonrocks: [],
                  dippedjoints: [],
                  cannagars: [],
                  kiefbox: 0,
                  vacoven: 0,
                  bubblebags: 0,
                  browniemix: 0,
                  stats: [],
                  traits:[],
                  terps:[],
                  v: 0
                }
              } else {
                  try {
                  state.users[json.to].buds.push(bud)
                } catch {'trying to send buds that dont belong to them'}
              }
              state.cs[`${json.block_num}:${from}`] = `${from} sent ${bud.strain} buds to ${json.to}`
          } else {
              state.cs[`${json.block_num}:${from}`] = `${from} doesn't own those buds`
          }
        }
    });

    //power up steem recieved from user minus cut
    processor.onOperation('transfer_to_vesting', function(json) {
        if (json.to == username && json.from == username) {
            const amount = parseInt(parseFloat(json.amount) * 1000)
            state.cs[`${json.block_num}:${json.from}`] = `${amount} to vesting`
            state.bal.b -= amount
            state.bal.p += amount
            for (var i = 0; i < state.refund.length; i++) {
                if (state.refund[i][1] == json.to && state.refund[i][2] == amount) {
                    state.refund.splice(i, 1);
                    break;
                }
            }
        }
    });

    processor.onOperation('comment_options', function(json) {
        for(var i = 0;i<state.refund.length;i++){
            if(state.refund[i][0]=='ssign'){
                if(state.refund[i][1][0][0]=='comment'){
                    if (json.author == streamname && json.permlink == state.refund[i][1][0][1].permlink && state.refund[i][1][0][0] == 'comment') {
                        state.refund.splice(i,1)
                    }
                }
            }
        }
    });

    processor.onOperation('vote', function(json) {
        for(var i = 0;i<state.refund.length;i++){
            if(state.refund[i] && state.refund[i][0]=='sign'){
                if(state.refund[i][1][0][0]=='vote'){
                    if (json.author == streamname && json.permlink == state.refund[i][1][0][1].permlink && state.refund[i][1][0][0] == 'vote') {
                        state.refund.splice(i,1)
                    }
                }
            }
        }
    });

    //allows users to delegate for a mine
    processor.onOperation('delegate_vesting_shares', function(json, from) { 
    const vests = parseInt(parseFloat(json.vesting_shares) * 1000000)
    var record = ''
    if(json.delegatee == username){
        for (var i = 0; i < state.delegations.length; i++) {
        if (state.delegations[i].delegator == json.delegator) {
            record = state.delegations.splice(i, 1)[0]
            break;
        }
        }
        state.cs[`${json.block_num}:${json.delegator}`] = `${vests} vested` 
        if (!state.users[json.delegator] && json.delegatee == username) state.users[json.delegator] = {
        addrs: [],
        seeds: [],
        breeder: '',
        hero: 1,
        guild: "",
        friends: [],
        v: 0
        }
        var availible = parseInt(vests / (state.stats.prices.listed.a * (state.stats.vs) * 1000)),
        used = 0;
        if (record) {
        const use = record.used || 0
        if (record.vests < vests) {
            availible = parseInt(availible) - parseInt(use);
            used = parseInt(use)
        } else {
            if (use > availible) {
            var j = parseInt(use) - parseInt(availible);
            for (var i = state.users[json.delegator].addrs.length - j; i < state.users[json.delegator].addrs.length; i++) {
                delete state.land[state.users[json.delegator].addrs[i]];
                state.lands.forSale.push(state.users[json.delegator].addrs[i])
                state.users[json.delegator].addrs.splice(i,1)
            }
            used = parseInt(availible)
            availible = 0
            } else {
            availible = parseInt(availible) - parseInt(use)
            used = parseInt(use)
            }
        }
        }
        state.delegations.push({
            delegator: json.delegator,
            vests,
            availible,
            used
        })
    }
    });

    processor.onOperation('transfer', function(json, from) {
        var wrongTransaction = 'ec-refunds'
        if (json.to == username && json.amount.split(' ')[1] == 'HIVE') {
            const amount = parseInt(parseFloat(json.amount) * 1000)
            var want = json.memo.split(" ")[0].toLowerCase(),
                type = json.memo.split(" ")[1] || '',
                seller = json.memo.split(" ")[2] || ''
            if (
                state.stats.prices.listed[want] == amount ||
                // seeds 
                want == 'diamond' && amount == state.stats.prices.listed.seeds.diamond || 
                want == 'sapphire' && amount == state.stats.prices.listed.seeds.sapphire || 
                want == 'emerald' && amount == state.stats.prices.listed.seeds.emerald || 
                want == 'ruby' && amount == state.stats.prices.listed.seeds.ruby ||
                // market seeds
                want == 'marketseed' && amount == state.users[seller].seeds[0][type].price
                ) {
                    if (
                         want == 'diamond' && amount == state.stats.prices.listed.seeds.diamond || 
                         want == 'sapphire' && amount == state.stats.prices.listed.seeds.sapphire || 
                         want == 'emerald' && amount == state.stats.prices.listed.seeds.emerald || 
                         want == 'ruby' && amount == state.stats.prices.listed.seeds.ruby
                        ) {
                        if (state.stats.supply.strains.indexOf(type) < 0){ type = state.stats.supply.strains[state.users.length % (state.stats.supply.strains.length -1)]}
                        var seed = {
                            stone: want,
                            owner: json.from,
                            originalStaker: username,
                            price: 0,
                            forSale: false,
                            pastValue: amount
                        }
                        if (!state.users[json.to]) {
                          state.users[json.to] = {
                            addrs: [],
                            gems: [seed],
                            breeder: "",
                            hero: 1,
                            guild: "",
                            friends: [],
                            v: 0
                          }
                         }
                         state.users[json.from].seeds.push(seed)

                        const c = parseInt(amount)
                        state.bal.c += c
                        state.bal.b += 0
                        state.cs[`${json.block_num}:${json.from}`] = `${json.from} purchased ${seed.strain}`

                }  else {
                        state.cs[`${json.block_num}:${from}`] = `${from} tried to buy gems but didn't meet the requirements code #1291`
                    }
                    if ( 
                    want === 'marketseed' &&  amount === state.users[seller].seeds[0][type].price && state.users[seller].seeds[0][type].forSale === true
                    ) {
                    if (want === 'marketseed') {

                        state.users[from].seeds = {
                            type: {
                                owner: from,
                                forSale: false,
                                price: 0,
                                pastValue: [
                                    state.users[seller].seeds[0][type].price,
                                ],
                                datePosted: 0
                             }
                        }

                        state.users[from].seeds.push(state.users[from].seeds)

                        //state.users[from].seeds.push(seedPosted)
                        
                      /*   if (seed) {
                             if (!state.users[from]) {
                               state.users[from] = {
                                 addrs: [],
                                 seeds: [seed],
                                 buds: [],
                                 pollen: [],
                                 breeder: from,
                                 farmer: 1,
                                 alliance: "",
                                 friends: [],
                                 inv: [],
                                 seeds: [],
                                 pollen: [],
                                 buds: [],
                                 kief: [],
                                 bubblehash: [],
                                 oil: [],
                                 edibles: [],
                                 joints: [],
                                 blunts: [],
                                 moonrocks: [],
                                 dippedjoints: [],
                                 cannagars: [],
                                 kiefbox: 0,
                                 vacoven: 0,
                                 bubblebags: 0,
                                 browniemix: 0,
                                 stats: [],
                                 traits:[],
                                 terps:[],
                                 v: 0
                               }
                             } else {
                                 state.users[from].seeds.push(seed)
                             }

                             state.cs[`${json.block_num}:${from}`] = `${from} purchased a ${type} seed from ${seller}`
                         } else {
                             state.cs[`${json.block_num}:${from}`] = `${from} doesn't have enough STEEM to purchase a seed`
                         }*/

                        delete state.users[seller].seeds[0][type];
                        
                        //pay etherchest
                        const c = parseInt(amount * 0.001)
                        state.bal.c += c
                        state.bal.b += 0
                        state.cs[`${json.block_num}:${json.from}`] = `${json.from} purchased ${want} from ${seller}`
                        //pay seller
                        state.refund.push(['xfer', seller, amount * 0.999, 'You succesfully completed a purchase with' + seller + "|" + want])
                        state.cs[`${json.block_num}:${json.from}`] = `${json.from} succesfully completed a purchase with ${seller} | ${type}`
                    }
                 } 
                else {
                state.refund.push(['xfer', wrongTransaction, amount, json.from + ' sent a weird transfer...refund?'])
            }
            } else if (amount > 10000000) {
                state.bal.r += amount
                state.refund.push(['xfer', wrongTransaction, amount, json.from + ' sent a weird transfer...refund?'])
                state.cs[`${json.block_num}:${json.from}`] = `${json.from} sent a weird transfer trying to purchase seeds/tools or managing land...please check wallet`
            }

        } else if (json.from == username) {
            const amount = parseInt(parseFloat(json.amount) * 1000)
            for (var i = 0; i < state.refund.length; i++) {
                if (state.refund[i][1] == json.to && state.refund[i][2] == amount) {
                    state.refund.splice(i, 1);
                    state.bal.r -= amount;
                    state.cs[`${json.block_num}:${json.to}`] = `${json.to} refunded successfully`
                    break;
                }
            }
        }
    });
    processor.onStreamingStart(function() {
        console.log("At real time.")
    });

    processor.start();

    //var transactor = steemTransact(client, steem, prefix);
    processor.on('return', function(json, from) {
        var index = state.users[from].addrs.indexOf(json.addr)
        if (index >= 0) {
            state.lands.forSale.push(state.users[from].addrs.splice(i, 1))
            state.bal.r += state.stats.prices.purchase.land
            if (state.bal.b - state.stats.prices.purchase.land > 0) {
                state.bal.b -= state.stats.prices.purchase.land
            } else {
                state.bal.d += state.stats.prices.purchase.land
            }
            state.refund.push(['xfer', from, state.stats.prices.purchase.land, 'We\'re sorry to see you go!'])
        }

    });

    function exit() {
        console.log('Exiting...');
        processor.stop(function() {
            saveState(function() {
                process.exit();
                //console.log('Process exited.');
            });
        });
    }
}

function ipfsSaveState(blocknum, hashable) {
    ipfs.add(Buffer.from(JSON.stringify([blocknum, hashable]), 'ascii'), (err, IpFsHash) => {
        if (!err) {
            if (IpFsHash[0].hash === undefined){
               ipfsSaveState(blocknum, hashable) 
            } else {
                state.stats.bu = IpFsHash[0].hash
                state.stats.bi = blocknum
                console.log(blocknum + `:Saved:  ${IpFsHash[0].hash}`)
                state.refund.push(['customJson', 'report', {
                    stateHash: state.stats.bu,
                    block: blocknum
                }])
            }
        } else {
            console.log('IPFS Error', err)
        }
    })
};
var bot = {
    xfer: function(toa, amount, memo) {
        const float = parseFloat(amount / 1000).toFixed(3)
        const data = {
            amount: `${float} STEEM`,
            from: username,
            to: toa,
            memo: memo
        }
        console.log(data, key)
        client.broadcast.transfer(data, key).then(
            function(result) {
                console.log(result)
            },
            function(error) {
                console.log(error)
            }
        );
    },
    customJson: function(id, json, callback) {
        if(json.block > processor.getCurrentBlockNumber() - 1000){
        client.broadcast.json({
            required_auths: [],
            required_posting_auths: [username],
            id: prefix + id,
            json: JSON.stringify(json),
        }, key).then(
            result => {
                console.log('Signed ${json}')
            },
            error => {
                console.log('Error sending customJson')
            }
        )} else {state.refund.splice(0,1)}
    },
    sign: function(op, callback) {
        console.log('attempting'+op[0])
        client.broadcast.sendOperations(op, key).then(
            function(result) {
                console.log(result)
            },
            function(error) {
                console.log(error)
                state.refund.pop()
            }
        );
    },
    ssign: function(op, callback) {
        console.log('attempting'+op[0])
        client.broadcast.sendOperations(op, skey).then(
            function(result) {
                console.log(result)
            },
            function(error) {
                console.log(error)
                state.refund.pop()
            }
        );
    },
    power: function(toa, amount, callback) {
        const op = [
            'transfer_to_vesting',
            {
                from: username,
                to: toa,
                amount: `${parseFloat(amount/1000).toFixed(3)} STEEM`,
            },
        ];
        client.broadcast.sendOperations([op], key).then(
            function(result) {
                console.log(result)
            },
            function(error) {
                console.log(error)
            }
        );
    },
    sendOp: function(op) {
        client.broadcast.sendOperations(op, key).then(
            function(result) {
                console.log(result)
            },
            function(error) {
                console.log(error)
            }
        );
    }
}

function whotopay() {
    var a = {
            a: [],
            b: [],
            c: [],
            d: [],
            e: [],
            f: [],
            g: [],
            h: [],
            i: [],
            j: []
        }, // 10 arrays for bennies
        b = 0, // counter
        c = 0, // counter
        h = 1, // top value
        r = {j:0,i:0,h:0,g:0,f:0,e:0,d:0,c:0,b:0,a:0}
        o = [] // temp array
    for (d in state.kudos) {
        c = parseInt(c) + parseInt(state.kudos[d]) // total kudos
        if (state.kudos[d] > h) { // top kudos(for sorting)
            h = state.kudos[d]
        };
        if (state.kudos[d] == 1) { // for sorting , unshift 1 assuming most will be 1
            o.unshift({
                account: d,
                weight: 1
            })
        } else {
            if(!o.length){o.unshift({ //if nothing to sort, unshift into array
                account: d,
                weight: parseInt(state.kudos[d])
            })}
            for (var i = o.length - 1; i > 0; i--) { // insert sort
                    if (state.kudos[d] <= o[i].weight) {
                        o.splice(i, 0, {
                            account: d,
                            weight: parseInt(state.kudos[d])
                        });
                        break;
                    } else if (state.kudos[d] > o[o.length-1].weight) {
                        o.push({
                            account: d,
                            weight: parseInt(state.kudos[d])
                        });
                        break;
                    }
            }
        }
    }
    if (o.length > (maxEx * 10)) {
        b = (maxEx * 10)
    } else {
        b = o.length
    }
    while (b) { // assign bennies to posts, top kudos down
        for (var fo in a) {
            a[fo].push(o.pop());
            b--
            if(!b)break;
        }
        if(b){
            for (var fr in r) {
                a[fr].push(o.pop());
                b--
                if(!b)break;
            }
        }
    }
    state.kudos = {} //put back bennies over the max extentions limit
        for (var i = 0; i < o.length; i++) {
            state.kudos[o[i].account] = parseInt(o[i].weight)
        }
    for (var r in a) { //weight the 8 accounts in 10000
        var u = 0,
            q = 0
        for (var i = 0; i < a[r].length; i++) {
            u = parseInt(u) + parseInt(a[r][i].weight)
        }
        q = parseInt(10000/u)
        for (var i = 0; i < a[r].length; i++) {
            a[r][i].weight = parseInt(parseInt(a[r][i].weight) * q)
        }
    }
    o = []
    for (var i in a){
        o.push(a[i])
    }
    console.log('payday:'+o)
    return o
}
function sortExtentions(a, key) {
    var b=[],c=[]
    for(i=0;i<a.length;i++){
        b.push(a[i][key])
    }
    b = b.sort()
    while (c.length < a.length){
      for(i=0;i<a.length;i++){
        if(a[i][key] == b[0]){
            c.push(a[i])
            b.shift()
        }
      }
    }
    return c
}

function popWeather (loc){
    return new Promise((resolve, reject) => {
        fetch(`http://api.openweathermap.org/data/2.5/forecast?lat=${state.stats.env[loc].lat}&lon=${state.stats.env[loc].lon}&APPID=${wkey}`)
        .then(function(response) {
            return response.json();
        })
        .then(function(r) {
            var tmin=400,tmax=0,tave=0,precip=0,h=0,p=[],c=[],w={s:0,d:0},s=[],d=r.list[0].wind.deg
            for(i=0;i<8;i++){
                tave += parseInt(parseFloat(r.list[i].main.temp)*100)
                if(r.list[i].main.temp > tmax){tmax = r.list[i].main.temp}
                if(r.list[i].main.temp < tmin){tmin = r.list[i].main.temp}
                h = r.list[i].main.humidity
                c = parseInt(c + parseInt(r.list[i].clouds.all))
                if(r.list[i].rain){
                    precip = parseFloat(precip) + parseFloat(r.list[i].rain['3h'])
                }
                s = r.list[i].wind.speed
            }
            tave = parseFloat(tave/800).toFixed(1)
            c = parseInt(c/8)
            state.stats.env[loc].weather = {
                high: tmax,
                low: tmin,
                avg: tave,
                precip,
                clouds: c,
                humidity: h,
                winds: s,
                windd: d
            }
            resolve(loc)
        }).catch(e=>{
            reject(e)
        })
    })
}


function cloudy(per){
    const range = parseInt(per/20)
    switch(range){
        case 4:
            return 'cloudy skies'
            break;
        case 3:
            return 'mostly cloudy skies'
            break;
        case 2:
            return 'scattered clouds in the sky'
            break;
        case 1:
            return 'mostly clear skies'
            break;
        default:
            return 'clear skies'

    }
}
function metWind(deg){
    const range = parseInt((deg-22.5)/8)
    switch(range){
        case 7:
            return 'North'
            break;
        case 6:
            return 'Northwest'
            break;
        case 5:
            return 'West'
            break;
        case 4:
            return 'Southwest'
            break;
        case 3:
            return 'South'
            break;
        case 2:
            return 'Southeast'
            break;
        case 1:
            return 'East'
            break;
        default:
            return 'Northeast'

    }
}

function listBens (bens){
    var text = `\n<h4>All etherchest Rewards go directly to our users!</h4>
                \n
                \nThis post benefits:
                \n`
    for(i=0;i<bens.length;i++){
        text = text + `* @${bens[i].account} with ${parseFloat(bens[i].weight/100).toFixed(2)}%\n`
    }
    return text
}

function sexing (){
    var sexAtBirth = 'Not Sexed';

    sex = Math.floor(Math.random() * 10) % 1.90;

    if(sex >= 1){
        sexAtBirth = "male";
    } else{
        sexAtBirth = "female";
    }
    return sexAtBirth
}

function daily(addr) {
    var grown = false
    if (state.land[addr]) {
        for (var i = 0; i < state.land[addr].care.length; i++) {
            if (state.land[addr].care[i][0] <= processor.getCurrentBlockNumber() - 28800) {
                state.land[addr].care.splice(i,1)
            } else if (state.land[addr].care[i][0] > processor.getCurrentBlockNumber() - 28800 && state.land[addr].care[i][1] == 'watered') {
                if(!grown)state.land[addr].care[i].push('')
                if (state.land[addr].substage < 7 && state.land[addr].stage > 0 && !grown) {
                    if(!grown){
                        state.land[addr].substage++;
                        grown = true;
                        kudo(state.land[addr].owner)
                    } else {
                        state.land[addr].aff.push([processor.getCurrentBlockNumber(), 'You watered too soon']);
                    }
                }
                if (state.land[addr].substage == 7) {
                    state.land[addr].substage = 0;
                    state.land[addr].stage++
                }
                //added sexing
                if (state.land[addr].stage == 2 && state.land[addr].substage == 0) state.land[addr].sex = sexing()//state.land.length % 1
                
                //afflictions
                if (state.land[addr].stage == 100 && state.land[addr].substage == 0) {
                    state.land[addr].aff.push([processor.getCurrentBlockNumber(), 'over']);
                    state.land[addr].substage = 7
                }
                for (var j = 0; j < state.land[addr].aff.length; j++) {
                    try {
                    if (state.land[addr].aff[j][0] > processor.getCurrentBlockNumber() - 86400 && state.land[addr].aff[j][1] == 'over') {
                        state.land[addr].substage--;
                        break;
                    }
                } catch(e) {
                    console.log('An affliction happened', e.message)
                   }
                }
            }
        }
    }
}