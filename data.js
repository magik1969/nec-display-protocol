const parameters =[
    //  Set/get active input. Argument: input_name or input_value. Returns selected input name. Examples: 'input DVI', 'input ?'
    {name: 'input', code: '0060', wDuration: 10000, dic:[
        ['VGA', 1],
        ['RGBHV', 2],
        ['DVI', 3],
        ['Option', 13],
        ['DisplayPort, DP, DP1, DPort1', 15],
        ['DisplayPort2, DP2, DPort2', 16],
        ['HDMI, HDMI1', 17],
        ['HDMI2', 18],
        ['DisplayPort3, DP3, DPort3', 128],
        ['HDMI3', 130]]},
    // Set/get LCD backlight if SpectraView if off
    {name: 'backlight', code: '0010', min: 0, max: 100},
    // Set/get picture contrast if SpectraView if off
    {name: 'contrast', code: '0012', min: 0, max: 100},
    // Set/get picture brightness if SpectraView if off
    {name: 'brightness', code: '0092', min: 0, max: 100},
    /*
    Set/get color temperature in Kelvin degree. SpectraView engine must be off.
    Argument is value between 0(2600K) and 74(10000K). Step is 1(100K).
    Value can be decimal 0-74 or string 2600K-10000K. If you want to use Kelvin values, remember to append 'K' to value
    Return value are Kelvins. 
    Example: 'colortemp 9600K', 'colortemp ?' return 9600K
    To make the param working, colorTemperatureCustom must be set to '10000K'  */
    {name: 'colorTemp', code: '0054', min: 0, max: 74,
        valEncode: function(val){return Math.floor(parseInt(val)/100) - 26},
        valDecode: function(val){return (val*100 + 2600) + 'K'}},
    // Turn SpectraView Engine on/off
    {name: 'spectraView', code: '1147', dic: [['off', 1], ['on', 2]]},
    // Select/get SpectraView Engine picture mode
    {name: 'pictureMode', code: '021A', dic:[['SVE1', 13],['SVE2', 14], ['SVE3', 15], ['SVE4', 16], ['SVE5', 17]]},
    
    //MULTI DISPLAY
    //  Set/get monitor ID
    {name: 'monitorID', code: '023E', min: 0, max: 100},
    //  Set/get horizontal number of displays in video wall. Used by matrix mode. Must be set for all displays in a wall/matrix
    {name: 'hMonitor', code: '02D0', min: 1,  max: 10},
    //  Set/get vertical number of displays in video wall. Used by matrix mode. Must be set for all displays in a wall/matrix
    {name: 'vMonitor', code: '02D1', min: 1,  max: 10},
    /*  Set/get ordinal number of display in a wall/matrix.
        Position value starts from 1 for upper left corner and increments following Z letters schema to last right bottom display.
        Example: 'position 3' can be left display in second row for 2x2 wall/matrix */
    {name: 'position', code: '02D2', min: 1, max: 100},
    //  Set/get matrix/tile mode on and off
    {name: 'matrixMode', code: '02D3', dic:[['off', 1], ['on', 2]]},
    //  Set/get tile compensation for tile/matrix mode
    {name: 'tileComp', code: '02D5', dic:[['off', 1], ['on', 2]]},

    //DISPLAY PROTECTION
    //  Set/get current temperature sensor
    {name: 'tempSensor', code: '0278', dic: [['sensor1', 1], ['sensor2', 2], ['sensor3', 3]]},
    //  Get temperature for current sensor. Return value is in Celsius
    {name: 'temperature', code: '0279', mode: 'r', valDecode: function(val){return val/2}},
    //  Set/get current fan for control/diagnostic
    {name: 'fan', code: '027A', dic:[['fan1', 1], ['fan2', 2], ['fan3', 3]]},
    //  Get status of current fan
    {name: 'fanStatus', code: '027B', mode: 'r', dic:[['off', 0], ['on', 1], ['error', 2]]},
    //  Set/get current fan control. Auto: depending of display temperature, on: fan always on
    {name: 'fanControl', code: '027D', dic: [['auto', 1], ['on', 2]]},
    //  Set/gat carrent fan speed mode. Example: 'fanSpeed low' 'fanSpeed ?'
    {name: 'fanSpeed', code: '103F', dic: [['high', 1], ['low', 2]]},

    //AUDIO
    //  Set/get audio volume    <item name="Unmute-set-only" value="0"/>
    {name: 'volume', code: '0062', min: 0, max: 100},
    // Mute/unmute audio
    {name: 'mute', code: '008D', dic: [['off-set', 0], ['on', 1], ['off', 2]]}
]

const commands = [
    {name: 'power', wDuration: 15000, 
        dics:[
        ['on', 1],
        ['off', 4]],
        msg: function(par=null){return `\x02C203D6000${par.toString()}\x03`},
        //replypatt: /00C203D6(\d{4})/
    },
    {name: 'powerStatus', msg: '\x0201D6\x03', replypatt: /02\d{2}D6000004(\d{4})/, dics: [
        ['on', 1],
        ['stand-by', 2],
        ['suspend', 3],
        ['off', 4]]},
    {name: 'dateTime', msg: '\x02C211\x03'}, //TODO
    {name: 'SN', msg: '\x02C216\x03', replypatt: /C316([A-F0-9]+)/, valDecode: function(str){return asciiHex2str(str)}},
    {name: 'model', msg: '\x02C217\x03', replypatt: /C317([A-F0-9]+)/, valDecode: function(str){return asciiHex2str(str)}},
    // Get diagnosis status from the display. Example: 'diagnosis' 
    {name: 'diagnosis', msg: '\x02B1\x03', replypatt: /A1([A-F0-9]+)/, dics:[
        ['normal', 0],
        ['standby-power +3.3V abnormality', 0x70],
        ['standby-power +5V abnormality', 0x71],
        ['panel-power +12V abnormality', 0x72],
        ['inverter power/Option slot2 power +24V abnormality', 0x78],
        ['Cooling fan-1 abnormality', 0x80],
        ['Cooling fan-2 abnormality', 0x81],
        ['Cooling fan-3 abnormality', 0x82],
        ['LED Backlight abnormality', 0x91],
        ['Temperature abnormality - shutdown', 0xA0],
        ['Temperature abnormality - half brightness', 0xA1],
        ['SENSOR reached at the temperature that the user had specified', 0xA2],
        ['No signal', 0xB0],
        ['PROOF OF PLAY buffer reduction', 0xD0],
        ['System error', 0xE0]
    ]},
]

function asciiHex2str(str){
	let ascii = '';
	for(let l=0; l<str.length; l=l+2){
		let i = parseInt(str[l] + str[l+1], 16);
		let ch = String.fromCharCode(i);
		if(i>0)
			ascii += ch;
	}
	return ascii;
}

module.exports = {
    parameters,
    commands
}