var sig

(function(exports){

//hd = document.querySelector("#root")
//hd.innerHTML = hd.innerHTML+'\n'+'===== SIG_CAND2: conid: '+JSON.stringify(conid)

const RESTART_TIMEOUT = 10*1000

let servers = null

let peer = null
let chan = null
let state = { state: 'init' }
let connected = false
let heartbeat = 0
let heartbeat_lasttime = (new Date()).getTime()
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

var chanSendCnt = 0

function chanSend(dt) {
  let time_now = (new Date()).getTime()
  let longout = time_now - heartbeat_lasttime
  if(longout > RESTART_TIMEOUT) {
    sig.reload('timeout retart')
  } else {
    if(chan!==null) {
      try {
        chan.send(JSON.stringify(dt))
      } catch(er) {
        chanSendCnt++
        if(chanSendCnt<1) {
          setTimeout(()=>chanSend(dt),200)
        } else {
          sig.reload(JSON.stringify(dt))
          //sig.reload('count '+chanSendCnt)
          chanSendCnt = 0
        }
      }
    }
  }
}

let hd

function sendSavedCand1(st) {
  while(cand1s.length>0) {
    const cand = cand1s.shift()
    sig.send('cand1', {conid:st.conid, candidate: cand} );
  }
}

let peers = {}

function actor0(st,act) {
  try {
  let act0, actoff, actans
  //const act0 = act
  switch(act.type) {
    case 'peer-offer-create':
      if(peers[act.peerid]===undefined) {
//console.log('>>>>>>> OFF #1')
        actoff = act
        peers[act.peerid] = act
      } else {
//console.log('>>>>>>> OFF #2')
        actoff = peers[act.peerid]
      }
      _Z('o01')
      actoff.peeroff = new RTCPeerConnection(servers);
      actoff.chan = act.peeroff.createDataChannel('dataChannel')
//      actoff.chan.onopen = ()=>console.log('OFFER OPEN')
//      actoff.chan.onclose = ()=>console.log('OFFER CLOSE')
//      actoff.chan.onerror = ()=>console.log('OFFER ERROR')
      actoff.chan.onmessage = (e) => act.action(JSON.parse(e.data), actoff.peer)
      actoff.peeroff.onicecandidate = e => {
        _Z('o10', e.candidate)
        chanSend({...actoff,type:'peer-offer-cand', candidate: e.candidate})
      }
      actoff.peeroff.onconnectionstatechange = (e)=> {
        _Z('o07')
      }
      actoff.peeroff.ondatachannel = (e)=> {
        _Z('o08')
      }
      actoff.peeroff.oniceconnectionstatechange = () => {
        _Z('o09')
//        console.log("OFF ICE STATE: ",actoff.peeroff.iceConnectionState)
      };  
      _Z('o05')
      actoff.peeroff.createOffer()
        .then(dsc => {
            _Z('o11', dsc)
            _Z('o02')
            actoff.peeroff.setLocalDescription(dsc)
            action({...actoff,type:'peer-offer-sdp',offdsc: dsc})
          }, ()=>{});
      return { ...st, state: act.type }

    case 'peer-answer-create':
      if(peers[act.peerid]===undefined) {
//console.log('>>>>>>> ANS #1')
        actans = act
        peers[act.peerid] = act
      } else {
//console.log('>>>>>>> ANS #2')
        actans = peers[act.peerid]
      }
      _Z('a01')
      actans.peerans = new RTCPeerConnection(servers);
      actans.peerans.ondatachannel = (e) => {
        _Z('a08')
        actans.peerans.chan = e.channel
        chanSend({type:'peer-success',peerid:actans.peerid})
      }
      actans.peerans.onicecandidate = e => {
        _Z('a10', e.candidate)
//        console.log('>>>>> ANSWER CANDIDATE 1/4', e.candidate)
        if(e.candidate!==null) {
          chanSend({
            ...actans,
            type:'peer-answer-cand',
            candidate: e.candidate})
        }
        //action({type:'peer-answer-cand', candidate: e.candidate})
      }

      actans.peerans.oniceconnectionstatechange = (e) => {
        _Z('a09')
      }  
      actans.peerans.onconnectionstatechange = (e) => {
        _Z('a07')
      }

      //_Z('a03', actans.offdsc)
      _Z('a03', actans)
      actans.peerans.setRemoteDescription(actans.offdsc)
      _Z('a05')
      actans.peerans.createAnswer().then((dsc)=> {
          _Z('a11',dsc)
          actans.ansdsc = dsc
          _Z('a02')
          actans.peerans.setLocalDescription(dsc)
          action({...actans,type:'peer-answer-sdp',ansdsc:dsc})
          if(actans.cand1s !== undefined) {
            while(actans.cand1s.length>0) {
              let cand = actans.cand1s.shift()
              _Z('a04',cand)
              actans.peerans.addIceCandidate(cand)
                .then(()=>{}, ()=>{});
            }
          }
        }, ()=>{})

      return { ...st, state: act.type }

    case 'peer-offer-ans-sdp':
      const offpeer = peers[act.peerid]
      _Z('o03',act.ansdsc)
      offpeer.peeroff.setRemoteDescription(act.ansdsc)
      return { ...st, state: act.type }

    case 'peer-answer-sdp':
      chanSend({...act, type:'peer-answer-sdp'})
//      console.log('==== ANSWER-SDP', act)
      return { ...st, state: act.type }

    case 'peer-offer-sdp':
      chanSend({...act, type:'peer-offer-sdp'})
//    console.log('OFFER-SDP', act)
      return { ...st, state: act.type }

    case 'peer-offer-cand':
      if(peers[act.peerid]===undefined) {
//console.log('>>>>>>> ANS CAND #1')
        actans = act
        peers[act.peerid] = act
      } else {
//console.log('>>>>>>> ANS CAND #2')
        actans = peers[act.peerid]
      }
      if(actans.peerans!==undefined) {
        _Z('a04',act.candidate)
        actans.peerans.addIceCandidate(act.candidate)
          .then(()=>{}, ()=>{});
      } else {
        if(actans.cand1s===undefined) actans.cand1s = []
        actans.cand1s.push(act.candidate)
      }
      return { ...st, state: act.type }

    case 'peer-answer-cand':
      const xpeer = peers[act.peerid]
//      console.log('==== ANSWER-CANDIDATE 5/4', xpeer)
      _Z('o04', act.candidate)
      xpeer.peeroff.addIceCandidate(act.candidate)
          .then(()=>{}, ()=>{});
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
      cand1s = []
      let baseid = act.appid.substring(0, act.appid.indexOf('/'))
//hd = document.querySelector("#head")
//hd = document.querySelector("#root")
//hd.innerHTML = JSON.stringify(servers)
      peer = new RTCPeerConnection(servers);
      chan = peer.createDataChannel('dataChannel')
_Z('X01')
      exports.chan = chan
      chan.onopen = ()=> {
        if(!connected) {
          sig.close()
          connected = true
        }
        action({type:'ready'})
      }
      //chan.onopen = ()=>action({type:'OpenChannel'})
      //chan.onclose = ()=>action({type:'CloseChannel'})
      //chan.onerror = ()=>action({type:'CloseChannel'})
      chan.onmessage = (e) => {
        action(JSON.parse(e.data))
      }
      peer.onicecandidate = e => {
        _Z('X10',e.candidate)
        action({type:'emitcand1', candidate: e.candidate})
      }
      peer.ondatachannel = e => {
        _Z('X08')
      }
      peer.oniceconnectionstatechange = e => {
        _Z('X09')
      }
      peer.onconnectionstatechange = e => {
        _Z('X07')
      }
      _Z('X05')
      peer.createOffer()
        .then(dsc => {
          _Z('X11')
          action({type:'getdesc',dsc})
        }, ()=>{});
      return { ...st, appid: act.appid, baseid, state: act.type };
    case 'emitcand1':
      if(st.conid) {
//hd = document.querySelector("#root")
//hd.innerHTML = hd.innerHTML+'\n'+'===== emit1 A:'+JSON.stringify(act)
        sendSavedCand1(st)
        sig.send('cand1', {conid:st.conid, candidate: act.candidate} );
      } else {
//hd = document.querySelector("#root")
//hd.innerHTML = hd.innerHTML+'\n'+'===== emit1 B:'+JSON.stringify(act)
        cand1s.push(act.candidate)
      }
      return { ...st, candidate: act.candidate, state: act.type }
    case 'oncand2':
      if(act.candidate) {
_Z('X04')
        peer.addIceCandidate(act.candidate)
          .then(()=>{}, ()=>{});
//hd = document.querySelector("#root")
//hd.innerHTML = hd.innerHTML+'\n'+JSON.stringify(act.candidate)
        return {...st, state: 'cand2-add', conid: act.conid}
      } else {
        return {...st, state: 'cand2-none'}
      }
    case 'joining':
_Z('X03')
      peer.setRemoteDescription(act.dsc2);
      sendSavedCand1(st)
      return {...st, dsc2: act.dsc2}
    case 'getdesc':
_Z('X02')
      peer.setLocalDescription(act.dsc);
      st = {...st, dsc: act.dsc, task: 'xxx'}
      sig.send('tojoin', {dsc:act.dsc, task: 'xxx'})
      //sig.send('tojoin', st);
      return st
/*
    case 'killSocket':
      if(!connected) {
        sig.close()
        connected = true
      }
//      console.log('CONID: '+st.conid)
//      actions.push({type:'ready'})
      return {...st, state: act.type}
*/
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
      if(!connected) {
        sig.close()
        connected = true
      }
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
      if(!connected) {
        sig.close()
        connected = true
      }
      heartbeat = act.count
      heartbeat_lasttime = (new Date()).getTime()
      count_from_last_heartbeat = 0
      chanSend({type:'heartbeat', count: act.count})
      return {...st, state: act.type}
  }
  } catch(er) {
    //console.log('action', er.message)
    console.log('action', er)
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
  if(opts.sig !== undefined) {
    sig = opts.sig
    sig.init({io,rtc:exports})
  }
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
exports.chan = chan
exports.chanSend = chanSend
  
function _Z(cd, tp='?', b) {
  return
  if(cd.startsWith('X')) return
  let msg = 'INFO '
  switch(cd) {
    case 'o10':
    case 'a10':
    case 'a04':
    case 'o04':
      //msg += JSON.stringify(tp)
      try {
        if( tp!==undefined && tp!==null
          && tp.type!==undefined && tp.address!==undefined) {
          msg += tp.type+":"+tp.address+":"+tp.port
        }
      } catch(er) {
      }
      break
    case 'a11':
    case 'o11':
    case 'o03':
    case 'a03':
/*
      try {
        console.log(msg+ ' :'+cd, tp)
        return
      } catch(er) {
      }
*/
  }
  msg += ':'+cd
  console.log(msg)
}

}(typeof exports === 'undefined' ? this.rtc = {} : exports));

