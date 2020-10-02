var steem = require('dsteem');
var axios = require('axios');
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

app.listen(port, () => console.log(`EtherChest API listening on port ${port}!`))
var state;
var startingBlock = ENV.STARTINGBLOCK || 47437400; //GENESIS BLOCKs
const username = ENV.ACCOUNT || 'etherchest'; //main account with all the SP
const key = steem.PrivateKey.from(ENV.KEY); //active key for account
const sh = ENV.sh || '';
const ago = ENV.ago || 47437400;
const prefix = ENV.PREFIX || 'etherchest_'; // part of custom json visible on the blockchain during watering etc..
const clientURL = ENV.APIURL || 'https://api.hivekings.com' // can be changed to another node
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

// converts Eth to Hive
function getEthToHive(amount) {
    return new Promise((resolve, reject) => {
      axios.get('https://api.coingecko.com/api/v3/simple/price?ids=hive%2Cethereum&vs_currencies=usd').then((res) => {
        const { data } = res
        const ethCost = data.ethereum.usd * amount
        const hiveAmount = ethCost / data.hive.usd
  
        resolve(hiveAmount.toFixed(3))
      }).catch((err) => {
        reject(err)
      })
    })
  }

function startApp() {
  if(state.cs == null) {
    state.cs = {}
  }
    processor = steemState(client, steem, startingBlock, 10, prefix);


    processor.onBlock(function(num, block) {
        var ethVault = 'ec-vault'
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
                    console.log('not enough stakers', e.message)
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

        if (num % 5 === 0 && processor.isStreaming()) {
            getEthToHive(1).then(price => {
            
            state.stats.prices.listed.gems.diamond = gemPrice;
            state.stats.prices.listed.gems.sapphire = price / 2;
            state.stats.prices.listed.gems.emerald = price / 4;
            state.stats.prices.listed.gems.ruby = price / 10;

            console.log('diamond price is ' + state.stats.prices.listed.gems.diamond);
            console.log('sapphire price is ' + state.stats.prices.listed.gems.sapphire);
            console.log('emerald price is ' + state.stats.prices.listed.gems.emerald);
            console.log('ruby price is ' + state.stats.prices.listed.gems.ruby);
            })
        }

        if (num % 100 === 0) {
            var d = parseInt(state.bal.c / 4)
            state.bal.r += state.bal.c
            if (d > 0) {
                state.refund.push(['xfer', ethVault, parseInt(4 * d), 'To Validator'])
                state.bal.c -= d * 4
                d = parseInt(state.bal.c / 5) * 2
                state.bal.c = 0
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
// https://hivesigner.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22etherchest%22%5D&id=etherchest_market_post_gem&json=%7B%22price%22%3A5000,%22gemPosted%22%3A%5B%22mis%22%5D%7D
/*processor.on('market_post_gem', function(json, from) {
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
                state.users[from].gems[0][gemnames].push(postedToMarket);*//*

                // set price and when it was posted
                state.users[from].gems[0][gemnames].price = json.price;
                state.users[from].gems[0][gemnames].datePosted = json.block_num;

                // set posted gem forSale to true in users inventory
                state.users[from].gems[0][gemnames].forSale = true;

            }
        } catch (e){
            state.cs[`${json.block_num}:${from}`] = `${from} can't post what is not theirs`
        }

    state.cs[`${json.block_num}:${from}`] = `${from} succesfully posted a ${json.gemPosted} gem for sale for ${json.price / 1000} STEEM`
});*/

//---------cancel sales-----------//
// https://hivesigner.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22etherchest%22%5D&id=etherchest_market_cancel_gem&json=%7B%22gemToCancel%22%3A%5B%22mis%22%5D%7D
/*processor.on('market_cancel_sale', function(json, from) {
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
});*/


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
    
    //search for etherchest_profile_name from user on blockchain since genesis
    //steemconnect link
    //https://hivesigner.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22etherchest%22%5D&id=etherchest_profile_name&json=%7B%22profile%22%3A%5B%22DevTeam%22%5D%7D
   /* processor.on('profile_name', function(json, from) {
        let profile = json.profile,
            profileName = ''
            try {
                for (var i = 0; i < 1; i++) {
                        state.users[from].profile = profile[i];
                        profileName += `${profile[i]}`
                    state.cs[`${json.block_num}:${from}`] = `${from} can't change another users name`
                } 
            } catch {
                (console.log(from + ' tried to change their profile name to ' + profileName + ' but an error occured'))
            }
        
        state.cs[`${json.block_num}:${from}`] = `${from} changed their profile name to ${profileName}`
    });

    //search for etherchest_farmer_type from user on blockchain since genesis
    //steemconnect link
    //https://hivesigner.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22USERNAME%22%5D&id=etherchest_farmer_type&json=%7B%22breeder%22%3A%5B%22TYPE%22%5D%7D
    processor.on('hero_type', function(json, from) {
        let hero = json.hero,
            heroType = 1
            try {
                for (var i = 0; i < 1; i++) {
                        state.users[from].hero = hero[i];
                        heroType += hero[i]
                    state.cs[`${json.block_num}:${from}`] = `${from} tried to change another users hero type.... blacklist?`
                }
             } catch {
            (console.log(from + ' changed their hero type to ' + heroType + ' but an error occured'))
        }

        state.cs[`${json.block_num}:${from}`] = `${from} changed their hero type to ${heroType}`
    });*/

    //search for etherchest_add_friend from user on blockchain since genesis
    //steemconnect link
   /* //https://hivesigner.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22etherchest%22%5D&id=etherchest_add_friend&json=%7B%22friend%22%3A%5B%22jonyoudyer%22%5D%7D
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
    });*/

    //search for etherchest_remove_friend from user on blockchain since genesis
    //steemconnect link
    /*//https://hivesigner.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22USERNAME%22%5D&id=etherchest_join_alliance&json=%7B%22alliance%22%3A%5B%22NAMEOFALLIANCE%22%5D%7D
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
    });*/

    //****ISSUE****//
    //search for etherchest_join_alliance from user on blockchain since genesis
    //steemconnect link
    //https://hivesigner.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22USERNAME%22%5D&id=etherchest_join_alliance&json=%7B%22alliance%22%3A%5B%22NAMEOFALLIANCE%22%5D%7D
   /*processor.on('join_guild', function(json, from) {
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
    //https://hivesigner.com/sign/custom-json?required_auths=%5B%5D&required_posting_auths=%5B%22USERNAME%22%5D&id=etherchest_create_alliance&json=%7B%22newAlliance%22%3A%5B%22NAMEOFALLIANCE%22%5D%7D
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
    });*/

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
        if (from == 'etherchest' && json.dust > 1) state.stats.dust = json.dust
        if (from == 'etherchest' && json.time > 1) state.stats.time = json.time
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
    /*processor.on('give_gem', function(json, from) {
        var gem= json.gem
        var newOwner= json.newOwner
        if(json.from && json.from.length > 2){
          try{
              for (var i = 0;i < state.users[from].gems.length; i++){
                  if (json.gem){
                    if(state.users[from].gems[i].gems === json.gem){
                      state.users[newOwner].gems[i].owner = json.newOwner;
                      gem=state.users[from].gems.splice(i, 1)[0]
                      break
                    }
                  } 
              }
          } catch (e) {}
          if (json.gem) {
              if (!state.users[json.newOwner]) {
                state.users[json.newOwner] = {
                  addrs: [],
                  gems: [gem],
                  hero: 1,
                  guild: "",
                  friends: [],
                  inv: [],
                  v: 0
                }
              } else {
                  state.users[json.newOwner].gems.push(gem)
              }
              state.cs[`${json.block_num}:${from}`] = `${from} sent a ${gem.xp} xp ${gem.gems} to ${json.to}`
          } else {
              state.cs[`${json.block_num}:${from}`] = `${from} doesn't own that gem`
          }
        }
    });*/

    /*power up steem recieved from user minus cut
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
    });*/

    /*processor.onOperation('comment_options', function(json) {
        for(var i = 0;i<state.refund.length;i++){
            if(state.refund[i][0]=='ssign'){
                if(state.refund[i][1][0][0]=='comment'){
                    if (json.author == streamname && json.permlink == state.refund[i][1][0][1].permlink && state.refund[i][1][0][0] == 'comment') {
                        state.refund.splice(i,1)
                    }
                }
            }
        }
    });*/

    /*processor.onOperation('vote', function(json) {
        for(var i = 0;i<state.refund.length;i++){
            if(state.refund[i] && state.refund[i][0]=='sign'){
                if(state.refund[i][1][0][0]=='vote'){
                    if (json.author == streamname && json.permlink == state.refund[i][1][0][1].permlink && state.refund[i][1][0][0] == 'vote') {
                        state.refund.splice(i,1)
                    }
                }
            }
        }
    });*/

    //allows users to delegate for a mine
    /*processor.onOperation('delegate_vesting_shares', function(json, from) { 
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
    });*/

    processor.onOperation('transfer', function(json, from) {
        var wrongTransaction = 'ec-refunds'
        if (json.to == username && json.amount.split(' ')[1] == 'HIVE') {
            const amount = parseInt(parseFloat(json.amount) * 1000)
            var want = json.memo.split(" ")[0].toLowerCase(),
                type = json.memo.split(" ")[1] || ''
            if (
                state.stats.prices.listed[want] == amount ||
                // gems 
                want == 'diamond' && amount == state.stats.prices.listed.gems.diamond || 
                want == 'sapphire' && amount == state.stats.prices.listed.gems.sapphire || 
                want == 'emerald' && amount == state.stats.prices.listed.gems.emerald || 
                want == 'ruby' && amount == state.stats.prices.listed.gems.ruby //||
                // market gems
                //want == 'marketgem' && amount == state.users[seller].gems[0][type].price <--- need for user market
                ) {
                    if (
                         want == 'diamond' && amount == state.stats.prices.listed.gems.diamond || 
                         want == 'sapphire' && amount == state.stats.prices.listed.gems.sapphire || 
                         want == 'emerald' && amount == state.stats.prices.listed.gems.emerald || 
                         want == 'ruby' && amount == state.stats.prices.listed.gems.ruby
                        ) {
                        if (state.stats.supply.gems.indexOf(type) < 0){ type = state.stats.supply.gems[state.users.length % (state.stats.supply.gems.length -1)]}
                        
                        //assign gem qualities
                        var gem = {
                            stone: want,
                            owner: json.from,
                            price: 0,
                            forSale: false,
                            pastValue: amount
                            }

                            if(state.users[json.from]){
                                state.users[json.from].gems.push(gem)
                            } else
                            
                            //if user does not exist in db create user and db entry
                            if (!state.users[json.from]) {
                            state.users[json.from] = {
                                addrs: [],
                                gems: [gem],
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

                }  else {
                        state.cs[`${json.block_num}:${from}`] = `${from} tried to buy gems but user probably doesnt exist #902`
                    }

            } else if (amount > 5) {
                state.bal.r += amount
                state.refund.push(['xfer', wrongTransaction, amount, json.from + ' sent more than 5 Hive trying to purchase gems...refund?'])
                state.cs[`${json.block_num}:${json.from}`] = `${json.from} sent more than 5 Hive trying to purchase gems...please check wallet`
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

// Needs work, not saving state to ipfs ERROR
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

/*var bot = {
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
}*/