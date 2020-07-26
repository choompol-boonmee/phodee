
(function(exports){

exports.webinit = function(opts={}) {
}

function start(io) {
  adm.postMessage({type:'start'},'*')
}

function reload(m) {
  if(m!==undefined) {
    //alert(m)
  }
  location.reload()
}

function restart(io) {
  adm.postMessage({type:'restart'},'*')
}

function send(sig, payld) {
  let pyld = JSON.parse(JSON.stringify(payld))
  adm.postMessage({type:'send',sig,...pyld},'*')
}

function close() {
  adm.postMessage({type:'close'},'*')
}

function mainActor(e) {
  let dt = e.data
  switch(dt.type) {
    case 'init':
      rtc.start_connect({RTCPeerConnection})
      //console.log('INIT IFRAME...')
      break
    default:
      //console.log('ACTION ...',dt.type)
      rtc.action(dt)
  }
}
window.addEventListener('message', mainActor, false)

var adm

exports.init = function(opts={}) {
  //<iframe id="adm" src="/prj05/res1/js/sig.html"></iframe>
  let divadm = document.querySelector("#divadm")
  while (divadm.firstChild) {
    divadm.removeChild(divadm.lastChild);
  }
  var iframe = document.createElement("iframe")
  iframe.src = '/prj05/res1/js/sig.html'
  divadm.appendChild(iframe)
  adm = iframe.contentWindow
  //adm = document.querySelector("#adm").contentWindow
}

exports.start = start
exports.reload = reload
exports.restart = restart
exports.send = send
exports.close = close

}(typeof exports === 'undefined' ? this.sig = {} : exports));

