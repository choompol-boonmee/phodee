
var request = require("request");
const port = parseInt(process.argv[2])
const wkcnt = parseInt(process.argv[3])
console.log("WORK CNT", wkcnt)
const express = require("express")
const app = express()
const server = require('http').Server(app)
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const io = require('socket.io-client');
const fs = require('fs')
const fnconfig = './config.json'

let config
let works = {}

function init() {
  if(!fs.existsSync(fnconfig)) {
    console.log('config.json does not exist')
    return
  }
  let rawconfig = fs.readFileSync(fnconfig)
  config = JSON.parse(rawconfig)
  if(config.baseid===undefined) {
    console.log('config.json does not contain baseid')
    return
  }
  //console.log('config.baseid: ', config.baseid)
}

function saveconfig() {
  rawconfig = JSON.stringify(config)
  fs.writeFileSync(fnconfig, rawconfig)
}

if(process.argv.length>2) {
  const arg1 = process.argv[2]
  if(arg1.startsWith("baseid=")) {
    const id0 = arg1.substring(7)
    console.log('new base id:', id0)
    config.baseid = id0
    saveconfig()
  } else {
  }
}

init()

var sk = io.connect('https://edipa.org/', { path: '/prj05/socket.io'});

let servers = null

sk.on('cand1', function(cand) {
  const conid = cand['conid']
  const work = works[conid]
//console.log('==== cand1: ', work)
  if(work) {
    request({uri: work, method: 'POST'
      , json: {...cand, type:'candidate'}}, (er,rs,opts) => {
    })
  }
});

const codelist 
  = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-";

let lastms = 0

function newID() {
  let dd1 = new Date();
  let ms0 = dd1.getTime()
  if(ms0<=lastms) { ms0 = lastms+1 }
  lastms = ms0
  dd1.setTime(ms0)
    let d1 = String.fromCharCode(codelist.charCodeAt(dd1.getDate()))
    let m1 = String.fromCharCode(codelist.charCodeAt(dd1.getMonth()+1))
    let yy = dd1.getFullYear()
    let y1 = Math.floor(yy / 64)
    let y2 = yy - y1 * 64
    let z1 = String.fromCharCode(codelist.charCodeAt(y1))
    let z2 = String.fromCharCode(codelist.charCodeAt(y2))
    let ss = dd1.getSeconds()
    let ms = dd1.getMilliseconds()
    let ms1 = ms/64
    let ms2 = ms%64
    let se = String.fromCharCode(codelist.charCodeAt(ss))
    let mi = String.fromCharCode(codelist.charCodeAt(dd1.getMinutes()))
    let ho = String.fromCharCode(codelist.charCodeAt(dd1.getHours()))
    let msa = String.fromCharCode(codelist.charCodeAt(ms1))
    let msb = String.fromCharCode(codelist.charCodeAt(ms2))
    let newid = [z2,z1,m1,d1,'-',ho,mi,se,msa,msb].join('')
  return newid
}


sk.on('connect', function() {
  console.log('base: '+config.baseid);
});

sk.on('appidreq', function(opts) {
  console.log('appidreq userAgent: ', opts.userAgent);
  let apid = config.baseid + '/a/' + newID();
  let msg2 = {...opts, appid: apid}
  sk.emit('newappid', msg2)
});

sk.on('servers', function(srv) {
  servers = srv
  sk.emit('base', config.baseid);
})

sk.on('getfile', function(req) {
  //console.log('get file', req.file)
  console.log('get file', req.dir, req.file)
  try {
  let data = "<H1>NO FILE</H1>"
  //let path = './'+req.file
  let path = './'+req.dir+'/'+req.file
  if(fs.existsSync(path)) {
    data = fs.readFileSync(path)
  }
  let req2 = {...req, data}
  sk.emit('getfile', req2)
  } catch(er) {
    console.log('ER1',er.message)
  }
})

sk.on('gethtml', function(req) {
  const lines = [
	'<!DOCTYPE html>',
	'<html lang="en">',
	'<head>',
	'<meta charset="utf-8" />',
//	'<link rel="icon" href="%PUBLIC_URL%/favicon.ico" />',
	'<meta name="viewport" content="width=device-width, initial-scale=1"/>',
	'<meta name="description" content="Web site"/>',
//	'<link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />',
	'<title>'+ req.sect+'</title>',
	'<script src="https://webrtc.github.io/adapter/adapter-latest.js"></script>',
	'<script src="/prj05/res1/js/rtc-websig-1.1.js"></script> ',
	'<script src="/prj05/res1/js/rtc-client-1.1.js"></script> ',
	'</head>',
	'<body>',
	'<div id="divadm"></iframe></div>',
	'<div id="head"></div>',
	'<div id="root"></div>',
	'<script>',
    'let executed = false',
	'function actor1(st,act) {',
	'  switch(act.type) {',
	'    case "ready":',
    '      window.addEventListener("beforeunload", (event) => {',
	'        rtc.chanSend({type:"closeChannel"})',
    '      })',
	'      let divadm = document.querySelector("#divadm")',
	'      divadm.style.display = "none"',
    '      if(!executed)',
	'      rtc.chanSend({type:"runScript", name: "'+ req.prog+'"})',
	'      return {...st, state: act.type}',
	'    case "runScriptEnd":',
	'      executed = true',
	'      return {...st, state: act.type}',
	'  }',
	'  return rtc.actor(st, act)',
	'}',
	'rtc.add_actor(actor1)',
    'sig.init({rtc:rtc})',
	'',
	'</script>',
	'</body>',
	'</html>',
  ];
  const html = lines.join('\n')
  let req2 = {...req, html}
  sk.emit('gethtml', req2)
})

let joinCnt = 0
let peers = {}

sk.on('tojoin', async function(opt) {
  joinCnt++
  let curWkNo = (joinCnt-1) % wkcnt + 1
  rtcurl = "http://localhost:" + (port+curWkNo) + "/rtc"
  acturl = "http://localhost:" + (port+curWkNo) + "/act"
  const conid0 = config.baseid + '/c'+curWkNo+'/' + newID();
  const json = {...servers, ...opt, conid:conid0, worker: acturl }
  works[conid0] = acturl
  console.log('tojoin no:', joinCnt, ' wk:', curWkNo, 'id', conid0)
  var options = { uri: rtcurl, method: 'POST', json };
  request(options, (er,rs,opts) => {
//    works[conid0] = opts.worker
  })
});

app.get('/close', (req, res) => {
console.log('close server..0')
  res.send('');
  //setTimeout(()=>app.close(), 300)
})

app.post('/iosock', (req, res) => {
  sk.emit(req.body.sig, req.body)
})

const peer_action = (act, peer) => {
  peer.actions.push(act)
  try {
    while(peer.actions.length>0) {
      const act0 = peer.actions.shift()
      let newst = peer.actor(peer.state, act0, peer)
      if(newst!==peer.state) {
        peer.state = newst
      }
    }
  } catch(er) {
  }
}

const peer_actor = (st, act, peer) => {
  let json
  switch(act.type) {
    case 'peer-begin':
//      console.log('===== actor-'+act.type, peer.offwk)
      json = {...peer, type: 'peer-offer-create'}
      request({uri: peer.offwk, method: 'POST', json},() => {})
      return {...st, status: act.type}

    case 'peer-answer-create':
//      console.log('===== BASE actor-'+act.type, peer)
      json = {...peer, type: act.type}
      request({uri: peer.answk, method: 'POST', json},() => {})
      return {...st, status: act.type}

    case 'peer-offer-ans-sdp':
//      console.log('===== BASE-'+act.type, peer)
      json = {...peer, type: act.type}
      request({uri: peer.offwk, method: 'POST', json},() => {})
      return {...st, status: act.type}
  }
  return st
}

function act_proc(proinf) {
  let peer
  switch(proinf.type) {
    case 'peer-start':
//console.log('BASE START PEER')
      peer = {
        task: 'peering',
        ...proinf,
        actions: [],
        actor: peer_actor,
        action: peer_action,
        state: { statue: proinf.type }
      }
      //console.log('process req...', peer)
      peers[proinf.peerid] = peer
      peer.action({type:'peer-begin'}, peer)
      break
    case 'peer-offer-sdp':
      peer = peers[proinf.peerid]
      peer.offdsc = proinf.offdsc
      console.log('===== BASE-'+proinf.type, peer.offdsc)
      peer.action({type:'peer-answer-create'}, peer)
      break
    case 'peer-answer-sdp':
//      console.log('===== BASE-'+proinf.type, proinf)
      peer = peers[proinf.peerid]
      peer.ansdsc = proinf.ansdsc
      peer.action({type:'peer-offer-ans-sdp'}, peer)
      break
    case 'peer-offer-cand':
      peer = peers[proinf.peerid]
      request({uri: peer.answk, method: 'POST', json:proinf},() => {})
      break
    case 'peer-answer-cand':
      peer = peers[proinf.peerid]
      request({uri: peer.offwk, method: 'POST', json:proinf},() => {})
      break
    case 'peer-success':
      _Z('b13')
      peer = peers[proinf.peerid]
      request({uri: peer.offwk, method: 'POST', json:proinf},() => {})
      break
  }
}

app.post('/act', (req, res) => {
  let peerid = config.baseid + '/p/' + newID();
  let offwk = works[req.body.offid]
  let answk = works[req.body.ansid]
  const pif = {peerid, ...req.body, offwk, answk}
  res.send(pif)
  setTimeout(()=>act_proc(pif), 50)
  //console.log('action req...', req.body)
})

server.listen(port)
console.log("start port: "+port)

function monitor() {
   console.log("MAIN ")
}

setInterval(monitor, 3000)

function _Z(cd, tp='?', b) {
  if(cd==='b13') console.log('PEER SUCESS...')
  //return
  let msg = 'INFO '
  switch(cd) {
  case 'Y01':
    break
  }   
  msg += ' :'+cd
  console.log(msg)
}

