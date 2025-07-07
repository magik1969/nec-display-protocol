const {parameters, commands} = require('./data');
const addressDefaults = {
    id: 1,
	wildcard_id: 'ALL', //-22
}
const tcpDefaults = {
	port: 7142
}
const serialDefaults = {
	baudRate: 9600,
	dataBits:8,
	parity: 'none',
	stopBits: 1
}
const optionsDefaults = {
	encoding: 'ASCII',
    wDuration: 500,
	rDuration: 500,
	splitter: {
		delimiter: '\r',
	}
}

/**
 * Encode command for device using its communication protocol
 * @param {string} cmd  - command to encode
 * @param {number|string} id  - display id, default 1, 'ALL' is a wilcard.
 * @returns {Object} cmdObj - an object containing encoded data and some other properties
 */
function encode(cmd, id = addressDefaults.id){
    let cmdObj = {
        command: cmd,
        id: id
    }
	let res = /^(?<name>\w+)(?: (?<value>[\w?% ]+))?/.exec(cmd);
	if(!res){
		cmdObj['status'] = 'Err'
		cmdObj['more'] = 'Wrong command format'
		return cmdObj;
	}
	let name = res.groups.name;
	let value = res.groups.value;

	let message, messageType;

	let par = parameters.find(el => el.name.toUpperCase() == name.toUpperCase());
	if(par){ //parameter
		if(value == '?'){
			messageType = 'C' //Get parameter
			message = `\x02${par.code}\x03`;
		}
		else{
			messageType = 'E' //Set parameter
			if(isNaN(Number(value))){ //value is not a number
				if(par.valEncode) //value encoding function exists
					value = par.valEncode(value);
				else try{ //try find value in dictionary
					let dicVal = par.dic.find(el => {
						let strvals = el[0].split(',');
						strvals = strvals.map(e => e.trim().toUpperCase())
						let strval = strvals.find(e => e == value.toUpperCase())
						if(strval)
							return true;
					})
					value = dicVal[1];
				}
				catch(err){
					cmdObj['status'] = 'Err'
					cmdObj['more'] = 'Wrong value'
					return cmdObj;
				}
			}
			message = `\x02${par.code}${decimal2Hex(value, 4)}\x03`
		}
	}
	else{	//command
		let cmd = commands.find(el=> el.name.toUpperCase() == name.toUpperCase())
		if(cmd){
			messageType = 'A' //Command
			try{
				let dicVal = cmd.dics.find(el => el[0].toUpperCase() == value.toUpperCase());
				value = dicVal[1];
			}
			catch(err){}
			if(cmd.msg instanceof Function)
				message = cmd.msg(value);
			else
				message = cmd.msg;
		}
		else{
			cmdObj['status'] = 'Err';
			cmdObj['more'] = `Can't find command`;
			return cmdObj;
		}
	}
	let header = '\x010';
	header += encodeID(id);
	header += '0';
	header += messageType;
	header += decimal2Hex(message.length);

	let commandStr = header + message;
	let bcc = calcBCC(commandStr)
	commandStr += String.fromCharCode(bcc) + '\x0D';
	cmdObj['encodedStr'] = commandStr;
	cmdObj['encoded'] = Buffer.from(cmdObj.encodedStr, optionsDefaults.encoding);
    return cmdObj;
}

/**
 * Decode response from display to useful form
 * @param {Buffer|string} data  - data to decode
 * @returns {Object} response - an response object
 */
function decode(data){
	let response = {}
	response['raw'] = data;
	let str = data.toString(optionsDefaults.encoding)
	response['rawStr'] = str;
	let result = /\x0100(?<id>.)(?<mtype>[A-F])(?<mlength>[A-Fa-f0-9]{2})\x02(?<message>[^\x03]+)\x03/.exec(data);//(?<bcc>[A-Fa-f0-9]{1})\x0D/;
	if(!result)
		return;
	response['id'] = decodeID(result.groups.id);
	let message = result.groups.message;
	let mtype = result.groups.mtype;
	let allvals = {}
	response['allValue'] = allvals;
	allvals['msgType'] = mtype;
	allvals['message'] = message;
	if(mtype == 'B'){ //command reply
		let cmd = commands.find(el => {
			let pat = el.replypatt? el.replypatt: /undefined/
			return pat.test(message)
		})
		if(cmd){ //command found
			let res = cmd.replypatt.exec(message);
			let val = res[1];
			allvals['strValue'] = val;
			if(cmd.valDecode)	// use value decoding function
				val = cmd.valDecode(val);
			else{	// value is a number
				val = parseInt(val, 16);
				allvals['numValue'] = val;
			}
			response['value'] = val;
			// try use a dictionary for value
			try{
				let dicval = cmd.dics.find(el => el[1] == val);
				response['value'] = dicval[0];
			}
			catch(err){}
		}
	}
	else if((mtype == 'D') || (mtype == 'F')){ //GET_PARAMETER_REPLY, SET_PARAMETER_REPLY
		let res = /(?<result>[A-Fa-f0-9]{2})(?<OP>[A-Fa-f0-9]{4})(?<type>[A-Fa-f0-9]{2})(?<max>[A-Fa-f0-9]{4})(?<value>[A-Fa-f0-9]{4})/.exec(message);
		allvals['result'] = res.groups.result;
		allvals['strValue'] = res.groups.value;
		let val = parseInt(res.groups.value, 16); 
		allvals['numValue'] = val; 
		response['value'] = allvals.numValue;
		let opcode = res.groups.OP
		allvals['OP'] = opcode;
		response['req'] = opcode;
		allvals['type'] = res.groups.type;
		allvals['max'] = res.groups.max;
		let param = parameters.find(el => el.code == opcode)
		if(param){ //parameter found
			response['req'] = param.name;
			if(param.valDecode)	// use value decoding function
				response['value'] = param.valDecode(val);
			else{ // try to find value in dictionary
				try{
					let dicval = param.dic.find(el => el[1] == val);
					let dicvalarr = dicval[0].split(',');
					response['value'] = dicvalarr[0].trim();
				}
				catch(err){}
			}
		}
	}
	return response;
}


function encodeID(id){
	let n = Number(id)
	if(n)
		n += 0x40;
	else if(id.toUpperCase() == 'ALL')
		n = 0x2A;
    return String.fromCharCode(n);
}
function decodeID(ascii){
	var decoded = ascii.charCodeAt(0);
	if(decoded >= 0x41)
		decoded = decoded - 0x40;
	else //group ID
		decoded = decoded + 0x10;
	return decoded;
}
function decimal2Hex(d, width=2) {
	var hex = Number(d).toString(16);
	while (hex.length < width) {
        hex = "0" + hex;
    }
    return hex.toUpperCase();
}
function calcBCC(ascii){
	let bcc = ascii.charCodeAt(1); //except SOH
    for(let i=2; i<ascii.length; i++)
        bcc = bcc^ascii.charCodeAt(i);
    return bcc;
}

module.exports = {
	encode,
	decode,
	tcpDefaults,
	serialDefaults,
	addressDefaults,
	optionsDefaults,
};