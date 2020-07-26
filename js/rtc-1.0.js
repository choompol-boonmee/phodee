
(function(exports){

const RESTART_TIMEOUT = 10*1000

let servers = null
let sk = null

let peer = null
let chan = null
let state = { state: 'init' }
let connected = false
let heartbeat = 0
let start_time = 0
let count_from_last_heartbeat = 0
let appid

let cand1s = []

let actors = [actor0]
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

/*
function tojoin() {
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
}
*/

function actor0(st,act) {
  try {
  switch(act.type) {
    case 'connect': 
      sk = io.connect('https://edipa.org/', { path: '/prj05/socket.io'});
      return { ...st, state: act.type }
/*
    case 'ready_tojoin':
      if(typeof appid === 'undefined') {
        action({type:'appidreq'})
      } else {
        action({type:'appidreq'})
        //action({type:'newappid', skid: sk.id, appid})
        //action({type:'tojoin', skid: sk.id, appid})
        //tojoin()
      }
      //if(localStorage.appid===undefined) {
      //} else {
      //}
      return { ...st, state: act.type }
*/
    case 'appidreq':
      sk.emit('appidreq', {skid: sk.id});
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
      return { ...st, skid: act.skid, appid: act.appid, baseid, state: act.type };
    case 'emitcand1':
      if(st.conid) {
        while(cand1s.length>0) {
          const cand = cand1s.shift()
          sk.emit('cand1', {...st, candidate: cand} );
        }
        sk.emit('cand1', {...st, candidate: act.candidate} );
      } else {
        cand1s.push(act.candidate)
      }
      //sk.emit('cand1', {...st, conid: act.conid} );
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
      sk.emit('tojoin', st);
      return st
    case 'killSocket':
      sk.disconnect()
      connected = true
      console.log('CONID: '+st.conid)
      action({type:'ready'})
      return {...st, state: act.type}
    case 'runScript':
      DOMEval(act.script)
      action({type:'runScriptEnd',name: act.name})
      return {...st, state: act.type}
    case 'saveScript':
      //localStorage[act.name] = act.script
      action({type:'saveScriptEnd',name: act.name})
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

function actionx(act) {
  actions.push(act)
  let st = state
  try {
    while(actions.length>0) {
      const act0 = actions.shift()
      let oldstate = state
      for(var i=actors.length-1; i>=0; i--) {
        console.log('state: '+act.type)
        st = actors[i](st, act)
        if(oldstate!==st) {
          break
        }
        Thread.sleep(10)
      }
    }
  } catch(er) {
    console.log('action', er.message)
  }
  state = st
}

function action(act) {
  actions.push(act)
  let st = state
  try {
    while(actions.length>0) {
      const act0 = actions.shift()
      let oldstate = state
      for(var i=actors.length-1; i>=0; i--) {
        console.log('state: '+act.type)
        st = actors[i](st, act)
        //(async ()=> await new Promise(r => setTimeout(r,10)))()
        if(oldstate!==st) {
          break
        }
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
  if(red!==undefined && red!==null) actors.push(red)
  start_time = (new Date()).getTime()
  action({type: 'connect'})
  sk.on('connect', function() { });
  sk.on('servers', function(srv) {
    servers = srv
    if(typeof appid === 'undefined') {
      action({type:'appidreq'})
    } else {
      action({type:'tojoin', skid: sk.id, appid})
    }
  });
  sk.on('newappid', function(apps) {
    action({type:'setappid', appid: apps.appid})
    action({type:'tojoin', skid: sk.id, appid: apps.appid})
  });
  sk.on('cand2', function(cand) {
    const {candidate, conid} = cand;
    action({type:'oncand2', candidate, conid})
  });
  sk.on('joined', function(msg) {
    const {dsc2} = msg
    action({type:'joining', dsc2})
  });
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
  actors.push(a)
}
  
exports.start_monitor = function (time_interval) {
  setInterval(monitor, time_interval)
}

exports.action = action
exports.actionx = actionx
exports.chanSend = chanSend
  
}(typeof exports === 'undefined' ? this.rtc = {} : exports));


