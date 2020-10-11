var dhive = require("@esteemapp/dhive");
var axios = require('axios');
var hivejs = require('@hiveio/hive-js');
var hiveState = require('./processor');
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

const init = require('./state');

const app = express();
const port = ENV.PORT || 3000;
const wkey = ENV.wkey;
const skey = dhive.PrivateKey.from(ENV.skey);
const streamname = ENV.streamname;

app.use(cors());

app.get('/p/:addr', (req, res, next) => {
    let addr = req.params.addr
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(state.land[addr], null, 3))
});

//shows the cs logs
app.get('/logs', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(state.cs, null, 3))
});

//shows the cs logs
app.get('/prices', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(state.stats.prices.listed.gems, null, 3))
});

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

//shows diamond by user
app.get('/diamonds/:user', (req, res, next) => {
    let user = req.params.user, arr = []
    res.setHeader('Content-Type', 'application/json');
    if(state.users[user]){
        for (var i = 0 ; i < state.users[user].diamond.length ; i++){
            arr.push(state.users[user].diamond[i])
        }
    }
    res.send(JSON.stringify(arr, null, 3))
});

//shows sapphires by user
app.get('/sapphires/:user', (req, res, next) => {
    let user = req.params.user, arr = []
    res.setHeader('Content-Type', 'application/json');
    if(state.users[user]){
        for (var i = 0 ; i < state.users[user].sapphire.length ; i++){
            arr.push(state.users[user].sapphire[i])
        }
    }
    res.send(JSON.stringify(arr, null, 3))
});

//shows emeralds by user
app.get('/emeralds/:user', (req, res, next) => {
    let user = req.params.user, arr = []
    res.setHeader('Content-Type', 'application/json');
    if(state.users[user]){
        for (var i = 0 ; i < state.users[user].emerald.length ; i++){
            arr.push(state.users[user].emerald[i])
        }
    }
    res.send(JSON.stringify(arr, null, 3))
});

//shows ruby by user
app.get('/rubys/:user', (req, res, next) => {
    let user = req.params.user, arr = []
    res.setHeader('Content-Type', 'application/json');
    if(state.users[user]){
        for (var i = 0 ; i < state.users[user].ruby.length ; i++){
            arr.push(state.users[user].ruby[i])
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

//post payouts in que
app.get('/refunds', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
        prices: state.stats.prices.listed.gems
    }, null, 3))
});
           
app.get('/u/:user', (req, res, next) => {
    let user = req.params.user
    const userState = state.users[user]
    res.setHeader('Content-Type', 'application/json');
    if(userState) {
      res.send(JSON.stringify(userState, null, 3))
    } else {
      res.send(JSON.stringify({}, null, 3))
    }
});

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
var startingBlock = ENV.STARTINGBLOCK || 47716399; //GENESIS BLOCK
const username = ENV.ACCOUNT || 'etherchest'; 
const key = dhive.PrivateKey.from(ENV.KEY); 
const sh = ENV.sh || ''; //state hash
const ago = ENV.ago || 47716399; //genesis block 
const prefix = ENV.PREFIX || 'etherchest_'; // part of custom json visible on the blockchain during watering etc..
var client = new dhive.Client(["https://api.openhive.network", "https://api.hivekings.com"]);
var processor;
var recents = [];
//const transactor = steemTransact(client, dhive, prefix);

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
    console.log("heres the variable "+ hash + " from startWith(hash)")
    console.log("this is sh" + sh)
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
    try {
  if(state.cs == null) {
    state.cs = {}
  }
    processor = hiveState(client, dhive, startingBlock, 10, prefix);

    processor.onBlock(function(num, block) {
        //process state.refunds
        if (num % 2 === 0 && state.refund.length && processor.isStreaming() || processor.isStreaming() && state.refund.length > 1) {
            if (state.refund[0].length == 4) {
                bot[state.refund[0][0]].call(this, state.refund[0][1], state.refund[0][2], state.refund[0][3])
                console.log("sent refund")
                state.refund.splice(i, 1)
            } else if (state.refund[0].length == 3){
                bot[state.refund[0][0]].call(this, state.refund[0][1], state.refund[0][2])
                console.log("sent refund")
                state.refund.splice(i, 1)
            }
        }
 
        if (num % 100 === 0 && !processor.isStreaming()) {
            client.database.getDynamicGlobalProperties().then(function(result) {
                state.bal.c = 0
                state.bal.r = 0
                console.log('At block', num, 'with', result.head_block_number - num, 'left until real-time.')
            });
        }

        if (num % 5 === 0 && processor.isStreaming()) {
            ipfsSaveState(num, JSON.stringify(state))
        }

        if (num % 28800 === 20000) {
            for (var item in state.cs){
              if(item.split(':')[0] < num - 28800 || item.split(':')[0] == 'state.cs undefined #438i'){
                delete state.cs[item]
              }
            }
        }

        // find and set gem price
        if (num % 5 === 0 && processor.isStreaming()) {

            getEthToHive(1).then(price => {

            let gemPrice = price * 1;
            
            state.stats.prices.listed.gems.diamond = Math.ceil(gemPrice * 1.007);
            state.stats.prices.listed.gems.sapphire = Math.ceil((gemPrice * 1.007) / 2) + 1;
            state.stats.prices.listed.gems.emerald = Math.ceil((gemPrice * 1.007) / 4) + 1;
            state.stats.prices.listed.gems.ruby = Math.ceil((gemPrice * 1.007) / 10) + 1;
            state.bal.c = 0

            console.log('bal.c is ' + state.bal.c);
            console.log('diamond price is ' + state.stats.prices.listed.gems.diamond);
            console.log('sapphire price is ' + state.stats.prices.listed.gems.sapphire);
            console.log('emerald price is ' + state.stats.prices.listed.gems.emerald);
            console.log('ruby price is ' + state.stats.prices.listed.gems.ruby);
            
            })
        }

        // store block number
        if (num % 5 === 0 && processor.isStreaming()) {
            state.stats.bi = num - 1
            console.log(state.stats.bi)
        }

       if (num % 1 === 0 && processor.isStreaming()) {
            var d = parseInt(state.bal.c / 4)
            state.bal.r += state.bal.c
            if (d > 0) {
                state.bal.c = 0
                state.bal.r = 0
                state.refund.push(['xfer', 'ec-vault', parseInt(4 * d), 'To Validator'])
                d = 0
            }
        }
  })

   /* processor.on('redeem', function(j, f) {
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
    });*/

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

    processor.on('register', function(json, from) {

                if (!state.users[json.from]) {
                    state.users[from] = {
                        addrs: [],
                        diamond: [],
                        emerald: [],
                        sapphire: [],
                        ruby: [],
                        ducats: 0,
                        hero: 1,
                        guild: "",
                        friends: [],
                        v: 0
                    }
                   state.userCount++;
                }
        state.cs[`${json.block_num}:${from}`] = `${from} succesfully registered`
    });

    // buying gems
    processor.onOperation('transfer', function(json, from) {
        var wrongTransaction = 'ec-refunds'
        if (json.to == username && json.amount.split(' ')[1] == 'HIVE') {
            const amount = parseInt(parseFloat(json.amount) * 1000)
            var want = json.memo.split(" ")[0].toLowerCase(),
                type = json.memo.split(" ")[1] || '',
                owner = json.from
            if (
                // gems 
                want == 'diamond' && amount == state.stats.prices.listed.gems.diamond || 
                want == 'sapphire' && amount == state.stats.prices.listed.gems.sapphire || 
                want == 'emerald' && amount == state.stats.prices.listed.gems.emerald || 
                want == 'ruby' && amount == state.stats.prices.listed.gems.ruby
                ) {
                    if (
                         want == 'diamond' && amount == state.stats.prices.listed.gems.diamond
                        ) {
                        if (state.stats.supply.gems.indexOf(type) < 0){ type = state.stats.supply.gems[state.users.length % (state.stats.supply.gems.length -1)]}

                        state.stats.gemCount += 1
                        state.stats.diamondCount += 1
                        
                        let gemCountNumber = "gd" + state.stats.diamondCount

                        if (!state.users[json.from]) {
                            state.users[json.from] = {
                                addrs: [],
                                diamond: [],
                                emerald: [],
                                sapphire: [],
                                ruby: [],
                                ducats: 0,
                                hero: 1,
                                guild: "",
                                friends: [],
                                v: 0
                            }
                        }
                
                        //assign gem qualities
                        var diamond = {
                            stone: want,
                            owner: owner,
                            price: 0,
                            forSale: false,
                            pastValue: amount,
                            guilded: false,
                            guildTreasury: 0,
                            gemID: gemCountNumber,
                            mature: false,
                            maturityBlock: processor.getCurrentBlockNumber() + 10220000
                            }

                            if(state.users[json.from]){
                                state.users[json.from].diamond.push(gemCountNumber)
                                state.gemList.push(diamond)
                            } else
                            
                            //if user does not exist in db create user and db entry
                            if (!state.users[json.from]) {
                            state.users[json.from] = {
                                addrs: [],
                                gems: [diamond],
                                ducats: 0,
                                hero: 1,
                                guild: "",
                                friends: [],
                                v: 0
                            }
                        }

                        var d = amount / 4;
                        state.refund.push(['xfer', 'ec-vault', parseInt(4 * d), 'To Validator'])

                        state.bal.b += 0
                        state.cs[`${json.block_num}:${json.from}`] = `${json.from} purchased a ${want}`
                        state.cs[`${json.block_num}:gem prices posted`]
                        console.log(`${json.from} purchased a ${want}`)

                    
                    } else if (
                        want == 'sapphire' && amount == state.stats.prices.listed.gems.sapphire
                       ) {
                       if (state.stats.supply.gems.indexOf(type) < 0){ type = state.stats.supply.gems[state.users.length % (state.stats.supply.gems.length -1)]}

                       state.stats.gemCount += 1
                       state.stats.sapphireCount += 1
                       
                       let gemCountNumber = "gs" + state.stats.sapphireCount

                       if (!state.users[json.from]) {
                           state.users[json.from] = {
                               addrs: [],
                               diamond: [],
                               emerald: [],
                               sapphire: [],
                               ruby: [],
                               ducats: 0,
                               hero: 1,
                               guild: "",
                               friends: [],
                               v: 0
                           }
                       }
               
                       //assign gem qualities
                       var sapphire = {
                           stone: want,
                           owner: owner,
                           price: 0,
                           forSale: false,
                           pastValue: amount,
                           guilded: false,
                           guildTreasury: 0,
                           gemID: gemCountNumber,
                           mature: false,
                           maturityBlock: processor.getCurrentBlockNumber() + 10220000
                           }

                           if(state.users[json.from]){
                               state.users[json.from].sapphire.push(gemCountNumber)
                               state.gemList.push(sapphire)
                           } else
                           
                           //if user does not exist in db create user and db entry
                           if (!state.users[json.from]) {
                           state.users[json.from] = {
                               addrs: [],
                               gems: [sapphire],
                               ducats: 0,
                               hero: 1,
                               guild: "",
                               friends: [],
                               v: 0
                           }
                       }

                       var d = parseInt(state.bal.c / 4)
                       state.bal.r += state.bal.c
                       if (d > 0) {
                           //state.refund.push(['xfer', 'ec-vault', parseInt(4 * d), 'To Validator'])
                           //state.bal.c -= d * 4
                           //d = parseInt(state.bal.c / 5) * 2
                           state.bal.c = 0
                       } else {
                           state.bal.c = 0
                       }

                       const c = parseInt(amount)
                       state.bal.c += c
                       state.bal.b += 0
                       state.cs[`${json.block_num}:${json.from}`] = `${json.from} purchased a ${want}`
                       state.cs[`${json.block_num}:gem prices posted`]
                       console.log(`${json.from} purchased a ${want}`)
                
                }  
             
                if (
                    want == 'emerald' && amount == state.stats.prices.listed.gems.emerald
                   ) {
                   if (state.stats.supply.gems.indexOf(type) < 0){ type = state.stats.supply.gems[state.users.length % (state.stats.supply.gems.length -1)]}

                   state.stats.gemCount += 1
                   state.stats.emeraldCount += 1
                   
                   let gemCountNumber = "ge" + state.stats.emeraldCount

                   if (!state.users[json.from]) {
                       state.users[json.from] = {
                           addrs: [],
                           diamond: [],
                           emerald: [],
                           sapphire: [],
                           ruby: [],
                           ducats: 0,
                           hero: 1,
                           guild: "",
                           friends: [],
                           v: 0
                       }
                   }
           
                   //assign gem qualities
                   var emerald = {
                       stone: want,
                       owner: owner,
                       price: 0,
                       forSale: false,
                       pastValue: amount,
                       guilded: false,
                       guildTreasury: 0,
                       gemID: gemCountNumber,
                       mature: false,
                       maturityBlock: processor.getCurrentBlockNumber() + 10220000
                       }

                       if(state.users[json.from]){
                           state.users[json.from].emerald.push(gemCountNumber)
                           state.gemList.push(emerald)
                       } else
                       
                    //if user does not exist in db create user and db entry
                       if (!state.users[json.from]) {
                       state.users[json.from] = {
                           addrs: [],
                           gems: [emerald],
                           ducats: 0,
                           hero: 1,
                           guild: "",
                           friends: [],
                           v: 0
                       }
                   }

                   var d = parseInt(state.bal.c / 4)
                   state.bal.r += state.bal.c
                   if (d > 0) {
                       //state.refund.push(['xfer', 'ec-vault', parseInt(4 * d), 'To Validator'])
                       //state.bal.c -= d * 4
                       //d = parseInt(state.bal.c / 5) * 2
                       state.bal.c = 0
                   } else {
                       state.bal.c = 0
                   }

                   const c = parseInt(amount)
                   state.bal.c += c
                   state.bal.b += 0
                   state.cs[`${json.block_num}:${json.from}`] = `${json.from} purchased a ${want}`
                   state.cs[`${json.block_num}:gem prices posted`]
                   console.log(`${json.from} purchased a ${want}`)

               

            } 
            if (
                want == 'ruby' && amount == state.stats.prices.listed.gems.ruby
               ) {
               if (state.stats.supply.gems.indexOf(type) < 0){ type = state.stats.supply.gems[state.users.length % (state.stats.supply.gems.length -1)]}

               state.stats.gemCount += 1
               state.stats.rubyCount += 1
               
               let gemCountNumber = "gd" + state.stats.rubyCount

               if (!state.users[json.from]) {
                   state.users[json.from] = {
                       addrs: [],
                       diamond: [],
                       emerald: [],
                       sapphire: [],
                       ruby: [],
                       ducats: 0,
                       hero: 1,
                       guild: "",
                       friends: [],
                       v: 0
                   }
               }
       
               //assign gem qualities
               var ruby = {
                   stone: want,
                   owner: owner,
                   price: 0,
                   forSale: false,
                   pastValue: amount,
                   guilded: false,
                   guildTreasury: 0,
                   gemID: gemCountNumber,
                   mature: false,
                   maturityBlock: processor.getCurrentBlockNumber() + 10220000
                   }

                   if(state.users[json.from]){
                       state.users[json.from].ruby.push(gemCountNumber)
                       state.gemList.push(ruby)
                   } else
                   
                   //if user does not exist in db create user and db entry
                   if (!state.users[json.from]) {
                   state.users[json.from] = {
                       addrs: [],
                       gems: [ruby],
                       ducats: 0,
                       hero: 1,
                       guild: "",
                       friends: [],
                       v: 0
                   }
               }
               
               var d = parseInt(state.bal.c / 4)
               state.bal.r += state.bal.c
               if (d > 0) {
                const amount = parseInt(parseFloat(json.amount) * 1000)
                for (var i = 0; i < state.refund.length; i++) {
                    if (state.refund[i][1] == json.to && state.refund[i][2] == amount) {
                        state.refund.splice(i, 1);
                        state.bal.r = 0;
                        state.cs[`${json.block_num}:${json.to}`] = `${json.to} refunded successfully`
                        break;
                    }
                }
                   state.bal.c = 0
               } else {
                   state.bal.c = 0
               }

               const c = parseInt(amount)
               state.bal.c += c
               state.bal.b += 0
               state.cs[`${json.block_num}:${json.from}`] = `${json.from} purchased a ${want}`
               state.cs[`${json.block_num}:gem prices posted`]
               console.log(`${json.from} purchased a ${want}`)

         
        } else if (
                    want == 'diamond' && amount < 5000 || 
                    want == 'sapphire' && amount < state.stats.prices.listed.gems.sapphire || 
                    want == 'emerald' && amount < state.stats.prices.listed.gems.emerald || 
                    want == 'ruby' && amount < state.stats.prices.listed.gems.ruby
                    ){
                        state.cs[`${json.block_num}:${from}`] = `${from} tried to buy gems but gem price probably doesnt match #379`
                        state.refund.push(['xfer', wrongTransaction, amount, json.from + ' sent less than the price of a gem ...refund?'])

                    }

            } else {
                state.refund.push(['xfer', wrongTransaction, amount, json.from + ' sent more than the price of gems...refund?'])
                state.cs[`${json.block_num}:${json.from}`] = `${json.from} sent more than the price of gems...please check wallet`
            }

        }/* else if (json.from == username) {
            const amount = parseInt(parseFloat(json.amount) * 1000)
            for (var i = 0; i < state.refund.length; i++) {
                if (state.refund[i][1] == json.to && state.refund[i][2] == amount) {
                    state.refund.splice(i, 1);
                    state.bal.r -= amount;
                    state.cs[`${json.block_num}:${json.to}`] = `${json.to} refunded successfully`
                    break;
                }
            }
        }*/
    });
    processor.onStreamingStart(function() {
        state.bal.c = 0
        console.log("At real time. Started from " + startingBlock)
    });

    processor.start();

    function exit() {
        console.log('Exiting...');
        processor.stop(function() {
            saveState(function() {
                process.exit();
                console.log('Process exited.');
            });
        });
    }

    
} catch (error) {
   console.log("shit crashed")
}
}

// Needs work, not saving state
function ipfsSaveState(blocknum, hashable) {
    console.log('inside of ipfsSaveState')
    ipfs.add(Buffer.from(JSON.stringify([blocknum, hashable]), 'ascii'), (err, IpFsHash) => {
        if (!err) {
            console.log('755 inside first if ipfsSaveState')
            if (IpFsHash[0].hash === undefined){
               ipfsSaveState(blocknum, hashable) 
            } else {
                console.log('759 inside first if ipfsSaveState')
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
        console.log('771 inside first if ipfsSaveState')
    })
    console.log('773 inside first if ipfsSaveState')
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