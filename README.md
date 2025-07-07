# Introduction
`nec-display-protocol` is Node module to encode and decode NEC displays commands using NEC control protocol for LCD monitors.

## Main features
- no external dependencies
- regardless of connection type (tcp/serial)
- just encode and decode functions
- no flow control
- helper constans for connection
- easy extensible parameters/commands file (data.js)

## Usage

```js
const NECD = require('nec-display-protocol');
let socket = net.createConnection(7142, '192.168.4.212', () => {
  let enc = NECD.encode('power on', 1);
  console.log('>', enc)
  socket.write(enc.encoded);
})
socket.on('data', data => {
  console.log('<', NECD.decode(data));
})

/* expected output
> {
  command: 'power on',
  id: 1,
  encodedStr: '\x010A0A0C\x02C203D60001\x03s\r',
  encoded: <Buffer 01 30 41 30 41 30 43 02 43 32 30 33 44 36 30 30 30 31 03 73 0d>
}
< {
  raw: <Buffer 01 30 30 41 42 30 45 02 30 30 43 32 30 33 44 36 30 30 30 31 03 76 0d>,
  rawStr: '\x0100AB0E\x0200C203D60001\x03v\r',
  id: 1,
  allValue: { msgType: 'B', message: '00C203D60001' }
}
*/
```
# Parameters and commands
NEC control protocol defines set of parameters and commands.  
Parameters are used to set or get states of LCD using single value. 
Parameter syntax is `parameter_name value|?`. 
Sample parameters are: `input, backlight, volume, spectraView`.
Parameters are defined in `parameter` array in `data.js` file.  You can also find accepted values here.  
Commands can be more complex and can accept multiple paremeters or return more complex structures. Command syntax is `command_name[ val1[ val2[...]]]`. 
Sample commands: `power, model, diagnosis`.
Supported commands are defined in `commands` array in data.js 

## `encode(cmd, id)` function
Encodes human friendly command to bytes according to NEC LCD control protocol.  
- `cmd <string>` - required. The cmd is a human friendly command which corresponds to NEC parameter or command name. For parameters you must provide a value or '?'. Examples: 'power on', 'backlight 30', 'input hdmi', 'input ?', 'sn ?'
- `id <number|string>` - optional. If not specified, default id 1 will be used. You can also use wildcard id 'ALL'. This affects monitor regardless of its id. It is usefull when you don't know monitor id or you want to control all displays connected with RS232 chain using single command.

Return value is `cmdObj <Object>`. The most important property is `encoded` which contains encoded command as Buffer. This buffer must be send to LCD. Other properties are helper ones.

## `decode(data)` function
Decodes response from NEC LCD into JS object.
- `data <Buffer|string>` - data read from TCP socket or serial port

Returns `response <Object|Null>` - an response object containing properties:
- `raw <Buffer>` - same as data if it contains valid protocol response
- `rawStr <string>` - raw as string
- `id <number>` - monitor id
- `req <string>` - a parameter or command name (request) 
- `value <string|number>` - decoded value. Return type depends on command
- `allValue <Object>` - some pre-decoded values, specific for NEC control protocol.

The function does not control completeness of data. It verifies if `data` is a valid protocol response and tries to decode it. If data is not a valid response, a null is returned.