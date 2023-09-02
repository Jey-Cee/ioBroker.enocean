/*jslint node: true */
/*jslint es6 */
'use strict';

const Transform = require('stream').Transform;
const CRC8 = require('./CRC8');
const BUFFER_LENGTH = 6 + 65536;

const syncBytes = Buffer.from([0xa5, 0x5a]);

class esp2parser extends Transform {
	constructor() {
		super();

		this.position = 0;
		this.buffer = Buffer.alloc(0);
		this.payloadLength = 0;  // length of payload
	}

	_transform(chunk, _, cb) {
		const totalLength = this.buffer.length + chunk.length;
		this.buffer = Buffer.concat([this.buffer, chunk], totalLength);
		this.processChunk(cb);

	}

	_flush(cb) {
		this.processChunk(cb);
	}

	processChunk(cb) {
		// find start sequence
		const syncIndex = this.buffer.indexOf(syncBytes);
		if (syncIndex === -1 || syncIndex + syncBytes.length > this.buffer.length - 1) return cb();
		try {
			// read header behind sync bytes and read telegram length
			const header = this.buffer.readUInt8(syncIndex + syncBytes.length);
			const telegramLength = header & 0x1f;

			// slice complete telegramm
			const lengthSyncAndHeader = syncBytes.length + 1;
			if (this.buffer.length >= syncIndex + lengthSyncAndHeader + telegramLength) {
				this.payloadLength = this.buffer[2];
				const arr = [...this.buffer.slice(syncIndex, telegramLength + lengthSyncAndHeader)];
				arr.splice(0, 3);
				arr.splice(0, 0, 0x55, 0x00, this.payloadLength, 0x02, 0x0A);
				arr.splice(5, 0, CRC8.getCRC8(this.buffer, 1, 2));
				arr.push(0x00, 0x01, 0x00, CRC8.calcCrc8(this.buffer));
				this.push(Buffer.from(arr));
				this.buffer = this.buffer.slice(syncIndex + telegramLength + lengthSyncAndHeader, this.buffer.length);
				this.processChunk(cb);
			} else {
				return cb();
			}
		} catch (e) {
			console.log(e);
		}
	}

}


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
						this.push(Buffer.from(this.buffer.slice(0, this.position + 1)));
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

module.exports = {esp2parser, esp3parser};
