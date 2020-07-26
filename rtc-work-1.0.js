
const DefaultRTCPeerConnection = require('wrtc').RTCPeerConnection;
const EventEmitter = require('events');
const fs = require('fs')
var request = require("request");

const port = parseInt(process.argv[2])
const wkno = parseInt(process.argv[3])
const mainurl = 'http://localhost:'+port
const express = require("express")
const app = express()
const PORT = port+wkno
const server = require('http').Server(app)
var bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let links = {}
let admins = {}
let adminListen = {}

class WebRtcConn extends EventEmitter {
  constructor(opts) {
    super()
    opts = {
      RTCPeerConnection: DefaultRTCPeerConnection,
      ...opts
    }
    const { RTCPeerConnection, iceServers, skid, dsc } = opts
    this.dsc = dsc
    this.opts = opts
    this.chan = null
    this.status = 'open'
_Z('Y01')
    this.peer = new RTCPeerConnection({iceServers})
    this.heartbeat_send = 0
    this.heartbeat_recv = 0
    let dd = new Date();
    this.startTime = dd.getTime()
    this.state = { type: '', state:'' }
    this.actions = []

    this.actor = (st, a) => {
      let dt = a
      switch(a.type) {
        case 'peer-success':
          _Z('a12')
          main_act(a)
          return {...st, state: a.type}
        case 'peer-answer-cand':
//          console.log('===== '+a.type+' 2/4 ', a)
          main_act(a)
          return {...st, state: a.type}
        case 'peer-offer-cand':
//          console.log('===== '+a.type+' 1/4 ', a)
          main_act(a)
          return {...st, state: a.type}
        case 'peer-answer-sdp':
//          console.log('------- WORKER peer-answer-sdp', a)
          main_act(a)
          return {...st, state: a.type}

        case 'peer-offer-sdp':
//          console.log('------- WORKER peer-offer-sdp', a)
          main_act(a)
          return {...st, state: a.type}

        case 'count':
          setTimeout(()=> {
            this.action({type:'sendcnt',cnt:a.cnt})
          }, 500)
          return {...st, state: a.type}
        case 'sendcnt':
          this.chanSend({type:'count',cnt:a.cnt})
          return {...st, state: a.type}
        case 'runScript':
          const raw = fs.readFileSync('js/'+dt.name+'.js', 'utf-8')
          dt = { type: 'runScript', name: dt.name, script: raw}
          this.chanSend(dt)
          return {...st, state: a.type}
        case 'getAppList':
          dt = {...dt, appList: Object.entries(admins).map(([k,v])=>k)}
          this.chanSend(dt)
          return {...st, state: a.type}
        case 'heartbeat':
          this.heartbeat_recv = dt.count
          return {...st, state: a.type}
        case 'closedChannel':
          this.close()
          return {...st, state: a.type}
        case 'peer-start':
//console.log('PEER START WORKING')
          //this.offid = a.offid
          //this.ansid = a.ansid
          main_act({
            type: a.type,
            monid: this.opts.conid,
            startTime: (new Date()).getTime(),
            offid: a.offid, 
            ansid: a.ansid}) 
          return {...st, state: a.type}
        case 'conn_offer_start':
          return {...st, state: a.type}
        case 'conn_offer_end':
          return {...st, state: a.type}
        case 'conn_answer_start':
          return {...st, state: a.type}
        case 'conn_answer_end':
          return {...st, state: a.type}
        case 'conn_offer_cand_start':
          return {...st, state: a.type}
        case 'conn_answer_cand_start':
          return {...st, state: a.type}
        case 'conn_answer_chann_start':
          return {...st, state: a.type}
      }
      return st
    }
    this.actors = [this.actor]
    this.action = (a0) => {
      try {
        this.actions.push(a0)
        while(this.actions.length>0) {
          const a = this.actions.shift()
          let oldstate = this.state
          for(var i=this.actors.length-1; i>=0; i--) {
            this.state = this.actors[i](this.state, a)
          }
          if(oldstate!==this.state) break
        }
      } catch(er) {
        console.log('====== ER1-Action: '+er.message)
      }
    }
    const onChannel = (e) => {
      _Z('Y08')
//console.log("ON CHANNEL", e.channel)
      this.chan = e.channel;
      this.chanSend = (e) => {
        if(this.chan) {
          try {
            if(this.chan.readyState==='open') {
//console.log("CHANSEND OK", e)
              this.chan.send(JSON.stringify(e))
            } else {
//console.log("CHANSEND NG", e)
            }
          } catch(er) {
console.log("CHANSEND ERROR", this.chan.readyState)
          }
        }
      }
      this.chan.onmessage = (e) => {
        let a = JSON.parse(e.data)
        this.action(a)
        // this.action(JSON.parse(e.data))
      }
      this.chan.onopen = (e) => {
        //this.chanSend({type:'killSocket'})
        this.status = 'ready';
        delete links[skid]
      }
    }
    this.peer.ondatachannel = onChannel;
    this.peer.onconnectionstatechange = e => {
      _Z('Y07')
    }
    this.peer.onicecandidate = e => {
      _Z('Y10')
      let scan = ''
      let wds = []
      if(e.candidate) {
        scan = JSON.stringify(e.candidate.candidate);
        scan = scan.replace('"','')
        scan = scan.replace('"','')
        wds = scan.split(' ')
      }
      if(wds.length>5) {
        console.log("C2-"+wds[7]+"  "+wds[2]+" IP="+wds[4]+":"+wds[5])
      }
      main_iosock('cand2', {...this.opts, candidate: e.candidate})
    }
    this.peer.oniceconnectionstatechange = () => {
      _Z('Y09')
      const dt = this.peer.iceConnectionState
      if (dt == 'connected') {
        console.log("ICE STATE: CONNECTED",this.opts.appid);
      } else if (dt == 'completed') {
        console.log("ICE STATE: COMPLETED",this.opts.appid);
      } else if (dt == 'disconnected') {
        console.log("ICE STATE: DISCONNECT",this.opts.appid);
      } else if (dt == 'failed') {
        console.log("ICE STATE: FAILD",this.opts.appid);
        try { admins[this.opts.conid].close() } catch(er) {}
      } else if (dt == 'checking') {
        console.log("ICE STATE: CHECKING",this.opts.appid);
      } else if (dt == 'new') {
        console.log("ICE STATE: NEW",this.opts.appid);
      } else {
        console.log("ICE STATE: '"+dt
          +':'+(dt=='connected'),this.opts.appid)
      }
    };
    const erDesc = (er)=> {};
    const goDesc = (dsc2)=>{
      _Z('Y11')
      try {
        this.opts = {...this.opts, dsc2};
        _Z('Y02')
        this.peer.setLocalDescription(dsc2)
        //this.peer.setRemoteDescription(this.dsc);
        main_iosock('joined', this.opts)
      } catch(er) { console.log('E5-Desc '+er.message) }
    }
    try {
      _Z('Y03')
      this.peer.setRemoteDescription(this.dsc);
      //this.peer.setRemoteDescription(dsc);
      _Z('Y05')
      this.peer.createAnswer().then(goDesc, erDesc);
    } catch(er) { console.log('E6-Desc '+er.message) }
    const errCand = () => {}
    const addCand = (err) => {}
    this.candidate = (candidate) => {
      try {
//console.log('==== cand1', candidate)
        _Z('Y04')
        this.peer.addIceCandidate(candidate)
        .then(addCand, errCand);
      } catch(er) { console.log('E7-Desc '+er.message) }
    }
    this.close = () => {
      try {
        this.peer.oniceconnectionstatechange = null
        this.peer.close()
        this.status = 'closed'
        this.emit('closed')
      } catch(er) { console.log("E8",er.message) }
    };
  } // End of constructor
} // End of WebRtcConn

function main_iosock(sig, dt) {
  let json = { ...dt, sig }
  let uri = mainurl +'/iosock'
  request({uri,method:'POST',json}, (er,rs,opts) => {
  })
}

function return_act(r) {
  //console.log('==== return from act', r)
}

function main_act(a) {
  let uri = mainurl +'/act'
  request({uri,method:'POST',json:a}, (er,rs,opts) => {
    //return_act(rs.body)
    return_act(rs)
    //console.log('action return ', rs.body)
  })
}

function deleteRtc(rtc) {
  //console.log('conid:', rtc.opts.conid)
  const closedListener = adminListen[rtc.opts.conid]
  delete adminListen[rtc.opts.conid]
  rtc.removeListener('closed', closedListener)
  delete admins[rtc.opts.conid]
}

app.post('/rtc', (req, res) => {
  //console.log('body:', req.body)
  const opts = req.body
  const { skid, conid } = opts
  const rtc = new WebRtcConn(opts)
  console.log('TOJOIN conid:'+conid)
  links[skid] = rtc
  admins[conid] = rtc
  function closeListener() { deleteRtc(rtc) }
  adminListen[conid] = closeListener
  rtc.once('closed', closeListener)
  const rs = {...req.body, worker: 'http://localhost:'+PORT+'/act'}
  res.json(rs)
})

app.post('/act', (req, res) => {
  let rtc2
  const {type} = req.body
  res.send('')
  switch(type) {
    case 'peer-success':
      rtc2 = admins[req.body.offid]
      break
    case 'peer-answer-cand':
      rtc2 = admins[req.body.offid]
      rtc2.chanSend(req.body)
      break
    case 'peer-offer-cand':
      rtc2 = admins[req.body.ansid]
      rtc2.chanSend(req.body)
      break
    case 'peer-answer-create':
      rtc2 = admins[req.body.ansid]
console.log(type, req.body)
      rtc2.chanSend(req.body)
      return
    case 'peer-offer-create':
      rtc2 = admins[req.body.offid]
      rtc2.chanSend(req.body)
      return
    case 'peer-offer-ans-sdp':
      rtc2 = admins[req.body.offid]
      rtc2.chanSend(req.body)
      return
    case 'candidate':
      const {candidate, conid} = req.body
      let rtc0 = admins[conid]
      if(rtc0!==undefined && candidate!==null) {
        rtc0.candidate(candidate);
      }
      break
    default:
      console.log('UNKNOWN ACTION', req.body)
  }
})

app.get('/close', (req, res) => {
console.log('close server..1')
  res.send({a:'a'})
  //setTimeout(()=>app.close(), 300) 
})

server.listen(PORT)
console.log("start port: "+PORT)

function monitor() {
   let rtcs = Object.entries(admins).map(([k,v])=>v)
   console.log("WORK "+rtcs.length)
   for(var i=0; i<rtcs.length; i++) {
     const {conid} = rtcs[i].opts
     const {heartbeat_send, heartbeat_recv, status } = rtcs[i]
     if(status==='ready') {
       const diff = heartbeat_send - heartbeat_recv
       if(diff>0) {
          console.log('CLOSE CONNECTION ', conid)
          rtcs[i].close()
       } else {
         rtcs[i].heartbeat_send++
         //console.log("HEARTBEAT ", conid, heartbeat_send, heartbeat_recv)
         let dt = { type: 'heartbeat', count: rtcs[i].heartbeat_send}
         rtcs[i].chanSend(dt)
         //rtcs[i].chan.send(JSON.stringify(dt))
       }
     } else {
       const startTime = rtcs[i].startTime
       let dd = new Date();
       const difTime = dd.getTime() - startTime
       if(difTime>3000) {
          //console.log('CONNECT TIMEOUT', difTime)
          rtcs[i].close()
       }
     }
   }
}

setInterval(monitor, 3000)

function _Z(cd, tp='?', b) {
  //if(cd==='a12') console.log('PEER SUCESS...')
  return
  let msg = 'INFO '
  switch(cd) {
  case 'Y01':
    break
  } 
  msg += ' :'+cd
  console.log(msg)
}

