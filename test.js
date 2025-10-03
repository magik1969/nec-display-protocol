/*
 * Script fo testing nec-display-protocol with real NEC display. You need to know display IP.
 * Verify connection using ping or http.
 * You must provide display IP as process argument eg 'node test 192.168.4.21'
 * Test sends only "read commands" and does not change display configuration.
 */

const net = require('node:net')
const NEC = require('./necd')
const {parameters, commands} = require('./data');

let rpaco = parameters.concat(commands)
rpaco = rpaco.filter(el => el.hasOwnProperty('mode') && el.mode.includes('r'))

let args = process.argv;
args.splice(0, 2);

let host =args[0];
let socket = new net.Socket();
socket.on('data', data => console.log('<',NEC.decode(data)));

if(host) //process argument
  socket.connect(NEC.tcpDefaults.port, host, () => dequeue());
else
  console.log('Please provide display IP as argument');

function dequeue(){
  if(rpaco.length < 1)
    return;
  let str = `${rpaco[0].name}?`
  let cmdo = NEC.encode(str, NEC.addressDefaults.wildcard_id);
  console.log('>', cmdo);
  if(cmdo.encoded.length > 0)
    socket.write(cmdo.encoded)
  setTimeout((() =>{
    rpaco.shift()
    dequeue();
  }).bind(this), cmdo.duration)
}