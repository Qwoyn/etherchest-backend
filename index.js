var hive = require('@hiveio/dhive');
var hivejs = require('@hiveio/hive-js');
var hivestate = require('./processor');
var hivetransact = require('./hive-transact');
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
const skey = hive.PrivateKey.from(ENV.skey);
const streamname = ENV.streamname;

app.use(cors());

/*plot info from state.js by plot number
            {
            "owner": "etherchest",
            "gems": "",
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

/*detailed list of gems a user owns from state.js by username\
        [
        {
            "owner": "etherchest",
            "gems": "",
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
            "gems": "hk",
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
            "gems": "mis",
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

//overal game stats i.e. number of gardeners, number of plants available, gem prices, land price, weather info
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

//shows gems by user
app.get('/gems/:user', (req, res, next) => {
    let user = req.params.user, arr = []
    res.setHeader('Content-Type', 'application/json');
    if(state.users[user]){
        for (var i = 0 ; i < state.users[user].gems.length ; i++){
            arr.push(state.users[user].gems[i])
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

/*plot and gem information by user
        {
        "addrs": [
            "a10",
            "c46",
            "a77",
            "a100"
        ],
        "gems": [
            {
                "gems": "kbr",
                "xp": 2250,
                "traits": [
                    "beta"
                ]
            },
            {
                "gems": "kbr",
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
var startingBlock = ENV.STARTINGBLOCK || 47320900; //GENESIS BLOCKs
const username = ENV.ACCOUNT || 'etherchest'; //main account with all the SP
const key = hive.PrivateKey.from(ENV.KEY); //active key for account
const sh = ENV.sh || '';
const ago = ENV.ago || 47320900;
const prefix = ENV.PREFIX || 'etherchest_'; // part of custom json visible on the blockchain during watering etc..
const clientURL = ENV.APIURL || 'https://api.openhive.network' // can be changed to another node
var client = new hive.Client(clientURL);
var processor;
var recents = [];
const transactor = hivetransact(client, hive, prefix);

/****ISSUE****/
//I think this is where the app can get the hash from etherchest_report that is saved in state.js and use it
//to start the app.  this should prevent the app having to start from GENESIS BLOCK
hivejs.api.getAccountHistory(username, -1, 100, function(err, result) {
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
        console.log('Didnt start with ipfs')
        state = init
        startApp()
    }
}

function startApp() {
  if(state.cs == null) {
    state.cs = {}
  }
    processor = hivestate(client, hive, startingBlock, 10, prefix);


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

        if (num % 28800 === 20000) {
            for (var item in state.cs){
              if(item.split(':')[0] < num - 28800 || item.split(':')[0] == 'state.cs undefined #438i'){
                delete state.cs[item]
              }
            }
        }
        if (num % 28800 === 0) {
            var d = parseInt(state.bal.c / 4)
            state.bal.r += state.bal.c
            if (d > 0) {
                state.refund.push(['xfer', 'etherchest', parseInt(4 * d), 'Funds'])
                state.bal.c -= d * 4
                d = parseInt(state.bal.c / 5) * 2
                state.bal.c = 0
                state.refund.push(['power', username, state.bal.b, 'Power to the people!'])
            }
    }
  })

//----------------------------------------------------------------------------------------
//
//===========================================
//                                          |
//         ****etherchest Market****        |
//                                          |
//===========================================


//---------posting sales-----------//
// https://beta.hiveconnect.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22etherchest%22%5D&id=etherchest_market_post_gem&json=%7B%22price%22%3A5000,%22gemPosted%22%3A%5B%22mis%22%5D%7D
processor.on('market_post_gem', function(json, from) {
    let postedgem = json.gemPosted,
        gemnames = ''

        gemnames += `${postedgem}`;

        try {
            if (state.users[from].gems[0][gemnames].owner === from && state.users[from].gems[0][gemnames].forSale === false) {

               /* // add gem to market
                const postedToMarket = {
                    price:  json.price,
                    posted: json.block_num
                }
                state.users[from].gems[0][gemnames].push(postedToMarket);*/

                // set price and when it was posted
                state.users[from].gems[0][gemnames].price = json.price;
                state.users[from].gems[0][gemnames].datePosted = json.block_num;

                // set posted gem forSale to true in users inventory
                state.users[from].gems[0][gemnames].forSale = true;

            }
        } catch (e){
            state.cs[`${json.block_num}:${from}`] = `${from} can't post what is not theirs`
        }

    state.cs[`${json.block_num}:${from}`] = `${from} succesfully posted a ${json.gemPosted} gem for sale for ${json.price / 1000} hive`
});

//---------cancel sales-----------//
// https://beta.hiveconnect.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22etherchest%22%5D&id=etherchest_market_cancel_gem&json=%7B%22gemToCancel%22%3A%5B%22mis%22%5D%7D
processor.on('market_cancel_sale', function(json, from) {
    let cancelgem = json.gemToCancel,
        gemnames = ''

        gemnames += `${cancelgem}`;
        
        var gem=''

        try {
            if (state.users[from].gems[0][gemnames].owner === from && state.users[from].gems[0][gemnames].forSale === true) {

                // reset price and posted time to 0
                state.users[from].gems[0][gemnames].price = 0;
                state.users[from].gems[0][gemnames].datePosted = 0;

                // set canceled gem forSale to false in users inventory
                state.users[from].gems[0][gemnames].forSale = false;

            }
        } catch (e){
            state.cs[`${json.block_num}:${from}`] = `${from} can't cancel what is not theirs`
        }

    state.cs[`${json.block_num}:${from}`] = `${from} succesfully canceled a ${json.gemToCancel} gem sale.`
});


//--------purchasing----------//
// found in transfer

//---------------------End Market---------------------------------------------------------


//----------------------------------------------------------------------------------------
//
//===========================================
//                                          |
//         ****etherchest profiles****      |
//                                          |
//===========================================
    
    //search for etherchest_breeder_name from user on blockchain since genesis
    //hiveconnect link
    //https://beta.hiveconnect.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22USERNAME%22%5D&id=etherchest_breeder_name&json=%7B%22breeder%22%3A%5B%22Willie%22%5D%7D
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
    //hiveconnect link
    //https://beta.hiveconnect.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22USERNAME%22%5D&id=etherchest_farmer_type&json=%7B%22breeder%22%3A%5B%22TYPE%22%5D%7D
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
    //hiveconnect link
    //https://beta.hiveconnect.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22etherchest%22%5D&id=etherchest_add_friend&json=%7B%22friend%22%3A%5B%22jonyoudyer%22%5D%7D
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
    //hiveconnect link
    //https://beta.hiveconnect.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22USERNAME%22%5D&id=etherchest_join_alliance&json=%7B%22alliance%22%3A%5B%22NAMEOFALLIANCE%22%5D%7D
    processor.on('remove_friend', function(json, from) {
        let friend = json.friend,
            friendName = ''
            try{
                for (var i = 0; i < 1; i++) {
                    friendName += json.friend

                    var friends = ''

                        try{
                            for (var i = 0;i < state.users[from].friends.length; i++) {
                                if(state.users[from].pollen[i].gems == json.friends) {
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
    //hiveconnect link
    //https://beta.hiveconnect.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22USERNAME%22%5D&id=etherchest_join_alliance&json=%7B%22alliance%22%3A%5B%22NAMEOFALLIANCE%22%5D%7D
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
    //hiveconnect link
    //https://beta.hiveconnect.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22USERNAME%22%5D&id=etherchest_create_alliance&json=%7B%22newAlliance%22%3A%5B%22NAMEOFALLIANCE%22%5D%7D
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

    processor.on('redeem', function(j, f) {
        state.cs[`${j.block_num}:${f}`] = `Redeem Op:${f} -> ${j}`
        if (state.users[f]){if (state.users[f].v && state.users[f].v > 0) {
            state.users[f].v--
            let type = j.type || ''
            if (state.stats.supply.gemss.indexOf(type) < 0) type = state.stats.supply.gemss[state.users.length % state.stats.supply.gemss.length]
            var gem = {
                gems: type,
                xp: 50
            }
            state.users[f].gems.push(gem)
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

    //checks for etherchest_give_diamond and allows users to send each other gems
    processor.on('give_gem', function(json, from) {
        var gem=''
        if(json.to && json.to.length > 2){
          try{
              for (var i = 0;i < state.users[from].gems.length; i++){
                  if (json.gem){
                    if(state.users[from].gems[i].gems === json.gem){
                      state.users[from].gems[i].owner = json.to;
                      gem=state.users[from].gems.splice(i, 1)[0]
                      break
                    }
                  } 
              }
          } catch (e) {}
          if (gem) {
              if (!state.users[json.to]) {
                state.users[json.to] = {
                  addrs: [],
                  gems: [gem],
                  hero: 1,
                  guild: "",
                  friends: [],
                  inv: [],
                  v: 0
                }
              } else {
                  state.users[json.to].gems.push(gem)
              }
              state.cs[`${json.block_num}:${from}`] = `${from} sent a ${gem.xp} xp ${gem.gems} to ${json.to}`
          } else {
              state.cs[`${json.block_num}:${from}`] = `${from} doesn't own that gem`
          }
        }
    });

    //power up hive recieved from user minus cut
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
        gems: [],
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
            type = json.memo.split(" ")[1] || ''//,
            //seller = json.memo.split(" ")[2] || ''              <-----uncomment if needed for marketgems
        if (
            state.stats.prices.listed[want] == amount ||
            // gems 
            want == 'diamond' && amount == state.stats.prices.listed.gems.diamond || 
            want == 'sapphire' && amount == state.stats.prices.listed.gems.sapphire || 
            want == 'emerald' && amount == state.stats.prices.listed.gems.emerald || 
            want == 'ruby' && amount == state.stats.prices.listed.gems.ruby //||
            // market gems
            //want == 'marketgem' && amount == state.users[seller].gems[0][type].price
            ) {
                if (
                     want == 'diamond' && amount == state.stats.prices.listed.gems.diamond || 
                     want == 'sapphire' && amount == state.stats.prices.listed.gems.sapphire || 
                     want == 'emerald' && amount == state.stats.prices.listed.gems.emerald || 
                     want == 'ruby' && amount == state.stats.prices.listed.gems.ruby
                    ) 
                    {
                        //checks for the amount of gems available in the market and subtracts 1 from amount if gem exists
                        if (state.stats.supply.gems.indexOf(type) < 0) { 
                            type = state.stats.supply.gems[state.users.length % (state.stats.supply.gems.length -1)]
                        }

                            //assign gem qualities
                            var gem = {
                            stone: want,
                            owner: json.from,
                            price: 0,
                            forSale: false,
                            pastValue: amount
                            }

                            if(state.users[json.to]){
                                state.users[json.from].gems.push(gem)
                            } else
                            
                            //if user does not exist in db create user and db entry
                            if (!state.users[json.to]) {
                            state.users[json.to] = {
                                addrs: [],
                                gems: [],
                                ducats: 0,
                                hero: 1,
                                guild: "",
                                friends: [],
                                v: 0
                            }
                        }

                        const c = parseInt(amount)
                        state.bal.c += c
                        state.bal.b += 0
                        state.cs[`${json.block_num}:${json.from}`] = `${json.from} purchased a ${want}`

                    } else {
                    state.cs[`${json.block_num}:${from}`] = `${from} tried to buy a ${want} but didn't meet the requirements error code #901`
                    }/*
                    if ( 
                    want === 'marketgem' &&  amount === state.users[seller].gems[0][type].price && state.users[seller].gems[0][type].forSale === true
                    ) {
                    if (want === 'marketgem') {

                        state.users[from].gems = {
                            type: {
                                owner: from,
                                forSale: false,
                                price: 0,
                                pastValue: [
                                    state.users[seller].gems[0][type].price,
                                ],
                                datePosted: 0
                             }
                        }

                        state.users[from].gems.push(state.users[from].gems)

                        //state.users[from].gems.push(gemPosted)
                        
                      /*   if (gem) {
                             if (!state.users[from]) {
                               state.users[from] = {
                                 addrs: [],
                                 gems: [gem],
                                 buds: [],
                                 pollen: [],
                                 breeder: from,
                                 farmer: 1,
                                 alliance: "",
                                 friends: [],
                                 inv: [],
                                 gems: [],
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
                                 state.users[from].gems.push(gem)
                             }

                             state.cs[`${json.block_num}:${from}`] = `${from} purchased a ${type} gem from ${seller}`
                         } else {
                             state.cs[`${json.block_num}:${from}`] = `${from} doesn't have enough hive to purchase a gem`
                         }*//*

                        delete state.users[seller].gems[0][type];
                        
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
                    }*/
                } else if (amount > 10000000 || amount < 4000) {
                    state.bal.r += amount
                    state.refund.push(['xfer', wrongTransaction, amount, json.from + ' tried to send a shitload or not enough...refund?'])
                    state.cs[`${json.block_num}:${json.from}`] = `${json.from} sent a weird transfer trying to purchase gems...please check wallet error code #984`
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

    //var transactor = steemtransact(client, hive, prefix);
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
            amount: `${float} hive`,
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
                amount: `${parseFloat(amount/1000).toFixed(3)} hive`,
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