// webrtc0.js
//

let peer = null
let chan = null
let state = { state: 'init' }
let servers = null
let sk = null
let heartbeat_count = 0
let heartbeat_recv = 0
let connected = false
const RESTART_TIMEOUT = 5*1000
const HEARTBEAT_TIMEOUT = 5*1000

function chanSend(dt) {
  if(chan!==null) {
    chan.send(JSON.stringify(dt))
  }
}

function actor0(st,act) {
  try {
  switch(act.type) {
    case 'connect': 
      sk = io.connect('https://edipa.org/', { path: '/prj05/socket.io'});
      return { ...st, state: act.type }
    case 'appidreq':
      sk.emit('appidreq', {skid: sk.id});
      return { ...st, state: act.type }
    case 'tojoin':
      let baseid = act.appid.substring(0, act.appid.indexOf('/'))
      peer = new RTCPeerConnection(servers);
      chan = peer.createDataChannel('dataChannel')
      chan.onopen = ()=>action({type:'OpenChannel'})
      chan.onclose = ()=>action({type:'CloseChannel'})
      chan.onerror = ()=>action({type:'CloseChannel'})
      chan.onmessage = (e) => action(JSON.parse(e.data))
      peer.onicecandidate = e => {
        action({type:'emitcand1', candidate: e.candidate})
      }
      peer.createOffer()
        .then(dsc => action({type:'getdesc',dsc}), ()=>{});
      return { ...st, skid: act.skid, appid: act.appid, baseid };
    case 'emitcand1':
      console.log('EMIT:', act.candidate)
      sk.emit('cand1', state);
      return { ...st, candidate: act.candidate, state: act.type}
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
      document.title = "CONID-"+state.conid
//alert('KILL SOCKET')
      sk.disconnect()
      connected = true
      action({type:'ready'})
      action({type:'heartbeat_send'})
      return {...st, state: act.type}
    case 'ready':
      return {...st, state: act.type}
    case 'runScript':
//alert("RUNSCRIPT")
      DOMEval(act.script)
      action({type:'runScriptEnd',name: act.name})
      return {...st, state: act.type}
    case 'saveScript':
      localStorage[act.name] = act.script
      action({type:'saveScriptEnd',name: act.name})
      return {...st, state: act.type}
    case 'runSaveScript':
      let sc = localStorage[act.name]
      DOMEval(sc)
      action({type:'runSaveScriptEnd',name: act.name})
      return {...st, state: act.type}
    case 'OpenChannel':
      return {...st, state: act.type}
    case 'CloseChannel':
      return {...st, state: act.type}
    case 'heartbeat_send':
      heartbeat_count++
      chanSend({type: act.type, heartbeat_count})
      setTimeout(
        ()=>action({type:'heartbeat_check', heartbeat_count})
         , HEARTBEAT_TIMEOUT)
      return {...st, state: act.type}
    case 'start_connect':
      console.log('START CONNECT')
      webrtc_init()
      setTimeout(
        ()=> { if(!connected) action({type:'start_connect'}) }
	 , RESTART_TIMEOUT)
      return {...st, state: act.type}
    case 'heartbeat_check':
      //console.log('HEART BEAT CHECK', heartbeat_count-heartbeat_recv)
      if(heartbeat_count-heartbeat_recv>0) {
        connected = false
        action({type:'start_connect'})
      } else {
        action({type:'heartbeat_send'})
      }
      return {...st, state: act.type}
    case 'heartbeat_recv':
      heartbeat_recv = act.heartbeat_count
      //console.log('HEART BEAT RECEIVED', act.heartbeat_count)
      return {...st, state: act.type}
  }
  } catch(er) {
    console.log('action', er.message)
  }
  return st
}

let actors = [actor0]
let actions = []

function action(act) {
  try {
    actions.push(act)
    while(actions.length>0) {
      const act0 = actions.shift()
      let oldstate = state
      for(var i=actors.length-1; i>=0; i--) {
        if(act.type==='ready') {
//alert("BEFORE ACTOR1 "+i+" :"+JSON.stringify(act))
          state = actors[i](state, {type:'ready'})
        } else {
          state = actors[i](state, act)
        }
        if(oldstate!==state) {
          break
        }
      }
    }
  } catch(er) {
    console.log('action', er.message)
  }
}

function onChannel() {}

function DOMEval( code ) {
  try {
    var script = document.createElement( "script" );
    script.text = code;
    document.head.appendChild(script).parentNode.removeChild(script);
  } catch(er) {
  }
}

function webrtc_init(red) {
//alert('init actor ..1')
  if(red!==undefined && red!==null) actors.push(red)
//alert('init actor ..2 c:'+actors.length)
  action({type: 'connect'})
  sk.on('connect', function() { });
  sk.on('servers', function(srv) {
    servers = srv
    if(localStorage.appid===undefined) {
      action({type:'appidreq'})
    } else {
      action({type:'tojoin', skid: sk.id, appid: localStorage.appid})
    }
  });
  sk.on('newappid', function(apps) {
    localStorage.appid = apps.appid
    action({type:'tojoin', skid: sk.id, appid: localStorage.appid})
  });
  sk.on('cand2', function(cand) {
    const {candidate, conid} = cand;
//alert('COND: '+ JSON.stringify(conid))
    action({type:'oncand2', candidate, conid})
  });
  sk.on('joined', function(msg) {
    const {dsc2} = msg
    action({type:'joining', dsc2})
  });
}

