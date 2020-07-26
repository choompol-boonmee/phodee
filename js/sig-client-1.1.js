
(function(exports){

let sk = null
function start(io) {
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

var io, rtc

exports.init = function(opts={}) {
  //console.log(opts)
  if(opts.io !== undefined) { io = opts.io }
  if(opts.rtc !== undefined) { rtc = opts.rtc }
}

exports.start = start
exports.send = send
exports.close = close

}(typeof exports === 'undefined' ? this.sig = {} : exports));

