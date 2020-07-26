
var div0 = document.getElementById('head')
var div1 = document.getElementById('root')

function onGET() {
  //alert('BEFORE SEND '+rtc.chan.readyState)
  div1.innerHTML = '.'
  let rt = rtc.chanSend({type:'getAppList'})
  if(rt !== undefined) {
    alert('RETURN '+rt)
  }
}

function actor2(st, a) {
  switch(a.type) {
  case 'getAppList':
    console.log('get App List', JSON.stringify(a.appList))
    let ll = a.appList
      .map(a=> '<b>'+a+'</b>'
               +'<input type=checkbox>'
               +'<input type=checkbox>'
      ).join('<br>\n')
    div1.innerHTML = ll
    return {...st,status:a.type}
  }
  return rtc.actor(st, a)
  //return st
}

rtc.add_actor(actor2)

div0.innerHTML = 
'<div><input type=button value="GETLIST" onClick="onGET()"></div>'+
'<div><input type=button value="RELOAD" onClick="location.reload()"></div>'+
''

