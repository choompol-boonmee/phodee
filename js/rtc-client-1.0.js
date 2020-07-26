
(function(exports){
let sk = null
function start() {
  sk = io.connect('https://edipa.org/', { path: '/prj05/socket.io'});
  sk.on('connect', function() { 
    rtc.action({type:'sig_connect'})
  });
  sk.on('servers', function(servers) {
    //console.log('servers', servers)
    rtc.action({type:'sig_servers',servers:servers})
  });
  sk.on('newappid', function(apps) {
    rtc.action({type:'sig_newappid',apps:apps})
  });
  sk.on('cand2', function(cand) {
    rtc.action({type:'sig_cand2',cand:cand})
  });
  sk.on('joined', function(desc) {
    rtc.action({type:'sig_joined',desc:desc})
  });
}

function send(sig, payld) {
    sk.emit(sig, {...payld, skid: sk.id})
}

function close() {
    sk.disconnect()
}

exports.start = start
exports.send = send
exports.close = close

}(typeof exports === 'undefined' ? this.sig = {} : exports));

(function(exports){

const RESTART_TIMEOUT = 10*1000

let servers = null

let peer = null
let chan = null
let state = { state: 'init' }
let connected = false
let heartbeat = 0
let start_time = 0
let count_from_last_heartbeat = 0
let appid

let cand1s = []

let cur_actor = actor0
let actions = []

function clear() {
  if(peer!==null) {
    peer.close()
  }
  peer = null
  chan = null
  connected = false
}

function chanSend(dt) {
  if(chan!==null) {
    chan.send(JSON.stringify(dt))
  }
}

function actor0(st,act) {
  try {
  switch(act.type) {
    case 'peer-offer-create':
      console.log('ACTION ', act.type)
      return { ...st, state: act.type }
    case 'connect': 
      sig.start()
      return { ...st, state: act.type }
    case 'sig_connect':
      return { ...st, state: act.type }
    case 'sig_servers':
      servers = act.servers
      if(typeof appid === 'undefined') {
        actions.push({type:'appidreq'})
      } else {
        actions.push({type:'tojoin', appid})
      }
      return { ...st, state: act.type }
    case 'sig_newappid':
      actions.push({type:'setappid', appid: act.apps.appid})
      actions.push({type:'tojoin', appid: act.apps.appid})
      return { ...st, state: act.type }
    case 'sig_cand2':
      const {candidate, conid} = act.cand;
      actions.push({type:'oncand2', candidate, conid})
      return { ...st, state: act.type }
    case 'sig_joined':
      const {dsc2} = act.desc
      actions.push({type:'joining', dsc2})
      return { ...st, state: act.type }
    case 'appidreq':
      sig.send('appidreq', {});
      return { ...st, state: act.type }
    case 'tojoin':
      let baseid = act.appid.substring(0, act.appid.indexOf('/'))
      peer = new RTCPeerConnection(servers);
      chan = peer.createDataChannel('dataChannel')
      //chan.onopen = ()=>action({type:'OpenChannel'})
      //chan.onclose = ()=>action({type:'CloseChannel'})
      //chan.onerror = ()=>action({type:'CloseChannel'})
      chan.onmessage = (e) => action(JSON.parse(e.data))
      peer.onicecandidate = e => {
        action({type:'emitcand1', candidate: e.candidate})
      }
      peer.createOffer()
        .then(dsc => action({type:'getdesc',dsc}), ()=>{});
      return { ...st, appid: act.appid, baseid, state: act.type };
    case 'emitcand1':
      if(st.conid) {
        while(cand1s.length>0) {
          const cand = cand1s.shift()
          sig.send('cand1', {...st, candidate: cand} );
        }
        sig.send('cand1', {...st, candidate: act.candidate} );
      } else {
        cand1s.push(act.candidate)
      }
      return { ...st, candidate: act.candidate, state: act.type }
    case 'oncand2':
      if(act.candidate) {
        peer.addIceCandidate(act.candidate)
          .then(()=>{}, ()=>{});
        return {...st, state: 'cand2-add', conid: act.conid}
      } else {
        return {...st, state: 'cand2-none'}
      }
    case 'joining':
      peer.setRemoteDescription(act.dsc2);
      return {...st, dsc2: act.dsc2}
    case 'getdesc':
      peer.setLocalDescription(act.dsc);
      st = {...st, dsc: act.dsc, task: 'xxx'}
      sig.send('tojoin', st);
      return st
    case 'killSocket':
      sig.disconnect()
      connected = true
      console.log('CONID: '+st.conid)
      actions.push({type:'ready'})
      return {...st, state: act.type}
    case 'runScript':
      DOMEval(act.script)
      actions.push({type:'runScriptEnd',name: act.name})
      return {...st, state: act.type}
    case 'saveScript':
      //localStorage[act.name] = act.script
      actions.push({type:'saveScriptEnd',name: act.name})
      return {...st, state: act.type}
    case 'runSaveScript':
      //let sc = localStorage[act.name]
      //DOMEval(sc)
      //action({type:'runSaveScriptEnd',name: act.name})
      return {...st, state: act.type}
    case 'start_connect':
      clear()
      webrtc_init()
      return {...st, state: act.type}
    case 'ready':
      //console.log('READY0...')
      return st
    case 'conn_two_conid_start':
      chanSend(act);
      return {...st, state: act.type}
    case 'count':
      console.log('recv count: '+act.cnt)
      chanSend({type:'count',cnt:act.cnt+1})
      return {...st, state: act.type}
    case 'heartbeat':
      heartbeat = act.count
      count_from_last_heartbeat = 0
      chanSend({type:'heartbeat', count: act.count})
      return {...st, state: act.type}
  }
  } catch(er) {
    console.log('action', er.message)
  }
  return st
}

function action(act) {
  actions.push(act)
  let st = state
  try {
    while(actions.length>0) {
      const act0 = actions.shift()
      let newst = cur_actor(st, act0)
      if(newst!==st) {
        console.log('state: '+act0.type)
        st = newst
      }
    }
  } catch(er) {
    console.log('action', er.message)
  }
  state = st
}

function DOMEval( code ) {
  try {
    var script = document.createElement( "script" );
    script.text = code;
    document.head.appendChild(script).parentNode.removeChild(script);
  } catch(er) {
  }
}

var appid2 = "b.edipa.org/c1/9999-9999"

function webrtc_init(red) {
  if(red!==undefined && red!==null) cur_actor = red
  start_time = (new Date()).getTime()
  action({type: 'connect'})
}


function monitor() {
  console.log('MONITOR')
  let diff = (new Date()).getTime() - start_time
  if(!connected) {
    if(diff>=RESTART_TIMEOUT) {
      action({type:'start_connect'})
    }
  } else {
    count_from_last_heartbeat++
    if(count_from_last_heartbeat>10) {
      action({type:'start_connect'})
    }
  }
}

var io, RTCPeerConnection

try {
var default_io = require('socket.io-client')
var default_RTCPeerConnection = require('wrtc').RTCPeerConnection
} catch(e) { }

exports.start_connect = function(opts={}) {
  opts = {
    io: default_io,
    RTCPeerConnection: default_RTCPeerConnection,
    ...opts
  }
  const { appid0 } = opts
  appid = appid0
  io = opts.io
  RTCPeerConnection = opts.RTCPeerConnection
  action({type:'start_connect'})
}


exports.add_actor = function (a) {
  cur_actor = a
}
  
exports.start_monitor = function (time_interval) {
  setInterval(monitor, time_interval)
}

exports.action = action
exports.actions = actions
exports.actor0 = actor0
exports.actor = actor0
exports.chanSend = chanSend
  
}(typeof exports === 'undefined' ? this.rtc = {} : exports));


