/*jslint node: true */
/*jslint es6 */
'use strict';

const Transform = require('stream').Transform;
const CRC8 = require('./CRC8');
const BUFFER_LENGTH = 6 + 65536;

class esp3parser extends Transform {
	constructor() {
		super();

		this.position = 0;
		this.buffer = Buffer.alloc(BUFFER_LENGTH);  // to be enhanced to have a variable length buffer
		this.payloadLength = 0;  // length of payload
	}

	_transform(chunk, _, cb) {
		let cursor = 0;

		while (cursor < chunk.length) {
			if ( (0x55 === chunk[cursor])  || (this.position > 0)) {
				this.buffer[this.position] = chunk[cursor];
				if (this.position === 5) {

					if (CRC8.getCRC8(this.buffer,1, 4) !== this.buffer[this.position]) {
						this.position = 0;  // wrong CRC
					} else {
						this.position++;
						this.payloadLength = (this.buffer[1] * 256) + this.buffer[2] + this.buffer[3];
					}
				} else if (this.position === ( 5 + this.payloadLength + 1)) {  // end of message + CRC
					if (CRC8.getCRC8(this.buffer,6, this.payloadLength) === this.buffer[this.position]) { // CRC
						this.push(Buffer.from(this.buffer.slice(0, this.position)));
					}
					this.position = 0;
					this.payloadLength = 0;
				} else {
					this.position++;
				}
			}
			cursor++;
		}
		cb();
	}


}

module.exports = esp3parser;