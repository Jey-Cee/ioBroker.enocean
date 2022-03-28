'use strict';

const ByteArray = require('./byte_array');

/**
 * Represents a packet received from the ESP3 serial interface
 */
class ESP3Packet {

	/**
	 * @param {Buffer} rawData The raw data to construct this packet from
	 */
	constructor(rawData) {

		// 2 bytes at position 1 => data length
		this.dataLength 	= rawData.readUInt16BE(1);
		this.optionalLength = rawData[3];
		this.type 			= rawData[4];
		this.data 			= rawData.slice(6, 6 + this.dataLength);
		this.optionalData 	= rawData.slice(6 + this.dataLength, 6 + this.dataLength + this.optionalLength);
	}

}

/**
 * Represents a packet with type = 1 -- RADIO_ERP1
 */
class RadioTelegram_ERP1 {

	/**
	 * @param {object} packet
	 */
	constructor(packet) {
		//Type of this packet (VLD, ADT, ...)
		this.type = packet.data[0];

		//Actual user data in this packet
		this.userData = packet.data.slice(1, -5).toString('hex');

		//Sender ID, e.g. AABBCCDD
		this.senderID = packet.data.slice(-5, -1).toString('hex');

		//Status byte
		this.status = packet.data[packet.data.length - 1];

		this.repeaterCount = ByteArray.from(this.status).getValue(5, 4).toString(16).toUpperCase();

		this.rssi = packet.optionalData[5];
	}
}


/**
 * Represents a packet with type = 2 -- RESPONSE
 */
class ResponseTelegram {
	/**
	 * @param {Buffer} rawData
	 */
	constructor(rawData) {
		this.dataLength 	= rawData.readUInt16BE(1);
		this.optionalLength = rawData[3];
		this.returnCode		= rawData.slice(6, 6 + 1);
		this.data 			= rawData.slice(7, 6 + this.dataLength);
		this.optionalData 	= rawData.slice(6 + this.dataLength, 6 + this.dataLength + this.optionalLength);

	}
}

/**
 * Represents a packet with type = 3 -- EVENT
 */
class EventTelegram {
	/**
	 * @param {Object} rawData
	 */
	constructor(rawData) {
		this.dataLength 	= rawData.dataLength;
		this.optionalLength = rawData.optionalLength;
		this.eventCode		= rawData.data.slice(0, 1).toString('hex');
		this.eventData 	= rawData.data.slice(1, this.dataLength - 1);
		this.optionalData 	= rawData.data.slice(1 + this.dataLength, this.optionalLength - 1);
	}
}

/**
 * Represents a packet with type = 10 -- RADIO_ERP2
 */
class RadioTelegram_ERP2 {

	/**
	 * @param {object} packet
	 */
	constructor(packet) {

		this.packet = packet;

		this.data = packet.data.slice(4, 4 + packet.dataLength -2);

		//Actual user data in this packet
		this.userData = this.data.slice(0, 4);

		//Sender ID, e.g. AABBCCDD
		this.senderID = this.data.slice(1, 5).toString('hex');

		//Status byte
		this.status = packet.data[packet.data.length - 2];

		this.repeaterCount = ByteArray.from(this.status).getValue(5, 4).toString(16).toUpperCase();


		this.main();
	}

	main() {
		switch(this.packet.data[0]) {
			case 0x05:
				this.type = 0xF6;
				break;
			case 0x06:
				this.type = 0xD5;
				break;
			case 0x07:
				this.type = 0xA5;
				break;
			default:
				this.type = this.packet.data[0];
		}
	}
}

/**
 * Represents a MSC telegram
 */
class MSCTelegram {

	/**
	 * @param {Buffer} packet
	 */
	constructor(packet) {

		/**
		 * Actual user data in this packet
		 */
		this.mfrID 	= ByteArray.from(packet).getValue(0, 12).toString(16).toUpperCase();

	}
}

/**
 * Represents a teach-in packet 1BS
 */
class OneBSTeachIn {

	/**
	 * @param {Buffer} packet
	 */
	constructor(packet) {

		/**
		 * Actual user data in this packet
		 */
		this.userData 	= 	packet.toString('hex');
		this.teachIn 	= 	(packet[0] & 0x00000008) >> 3;

	}
}

/**
 * Represents a teach-in packet 4BS
 */
class FourBSTeachIn {

	/**
	 * @param {Buffer} packet
	 */
	constructor(packet) {

		/**
		 * Actual user data in this packet
		 */
		this.userData 	= 	packet.toString('hex');
		this.teachIn 	= 	ByteArray.from(packet).getValue(28, 1);
		this.LRNtype 	= 	ByteArray.from(packet).getValue(24, 1);
		this.LRNStatus	=	ByteArray.from(packet).getValue(27, 1);
		this.EEPFunc 	= 	ByteArray.from(packet).getValue(0, 6);
		this.EEPType 	= 	ByteArray.from(packet).getValue(6, 7);
		this.mfrID		= 	ByteArray.from(packet).getValue(13, 11);

	}
}

/**
 * Represents a teach-in packet UTE
 */
class UTETeachIn {

	/**
	 * @param {Buffer} packet
	 */
	constructor(packet) {

		/**
		 * Actual user data in this packet
		 */
		this.userData 			= packet.toString('hex');
		this.communication		= ByteArray.from(packet).getValue(0, 1);
		this.response			= ByteArray.from(packet).getValue(1, 1);
		this.request			= ByteArray.from(packet).getValue(2, 2);
		this.cmd				= ByteArray.from(packet).getValue(4, 4);
		this.channels			= ByteArray.from(packet).getValue(8, 8);
		this.EEPRorg			= ByteArray.from(packet).getValue(48, 8).toString(16);
		this.EEPFunc 			= ByteArray.from(packet).getValue(40, 8).toString(16);
		this.EEPType 			= ByteArray.from(packet).getValue(32, 8).toString(16);
		this.IDLSB				= ByteArray.from(packet).getValue(16, 8).toString(16);
		this.IDMSB				= ByteArray.from(packet).getValue(29, 3).toString(16);

	}
}



module.exports = {
	ESP3Packet: ESP3Packet,
	RadioTelegram: RadioTelegram_ERP1,
	ResponseTelegram: ResponseTelegram,
	RadioTelegram_ERP2: RadioTelegram_ERP2,
	MSCTelegram: MSCTelegram,
	OneBSTeachIn: OneBSTeachIn,
	FourBSTeachIn: FourBSTeachIn,
	UTETeachIn: UTETeachIn,
	EventTelegram: EventTelegram
};
