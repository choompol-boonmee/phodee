
var sig = require('./sig-client-1.1.js')
var rtc = require('./rtc-client-1.1.js')

let job = process.argv[2]
let offid = ""
let ansid = ""
let arvc = process.argv.length
if(arvc>3) offid = process.argv[3]
if(arvc>4) ansid = process.argv[4]
let io = require('socket.io-client');
let RTCPeerConnection = require('wrtc').RTCPeerConnection;

if(job==='offer') { // Begin offer action
  function actor(st,act) {
//console.log('offer action '+act.type)
    switch(act.type) {
      case 'setappid':
        //console.log('NEWAPPID off', act.appid)
        return st
      case 'ready': 
//console.log('offer ready')
        rtc.action({type:'count', cnt:1})
        return {...st, state: act.type}
    }
    return rtc.actor(st,act)
    //return st
  }
  rtc.add_actor(actor)
} // Begin offer action

if(job==='answer') { // Begin answer action
  function actor(st,act) {
    switch(act.type) {
      case 'setappid':
        //console.log('NEWAPPID ans', act.appid)
        return st
      case 'ready': 
        rtc.action({type:'count', cnt:1})
        return {...st, state: act.type}
    }
    return rtc.actor(st,act)
    //return st
  }
  rtc.add_actor(actor)
} // Begin offer action

if(job==='spy') { // Begin spy action
  function actor(st,act) {
    switch(act.type) {
      case 'setappid':
        //console.log('NEWAPPID spy', act.appid)
        return st
      case 'ready': 
        //rtc.action({type:'peer-start', offid, ansid})
        rtc.actions.push({type:'peer-start', offid, ansid})
        return {...st, state: act.type}
      case 'peer-start':
        rtc.chanSend(act)
        return {...st, state: act.type}
    }
    //return st
    return rtc.actor(st,act)
  }
  rtc.add_actor(actor)
} // End spy action

var appid0 = "b.edipa.org/c1/9999-9999"
sig.init({io,rtc})
rtc.start_connect({io, RTCPeerConnection, sig})
//rtc.start_connect({io, RTCPeerConnection, appid0})

rtc.start_monitor(3000)

