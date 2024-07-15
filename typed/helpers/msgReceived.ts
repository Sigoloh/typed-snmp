import { clearRequest } from "./clearRequest";
import { parse } from "./parse";
const asn1ber = require("../../lib/asn1ber")
import { Packet } from "../types/Packet";
import { Session } from "../classes/Session";

export const msgReceived = (msg: Buffer, rinfo: any, self: Session) => {
    var now = Date.now(), pkt: Packet, entry: any;

    if (msg.length === 0) {
        // Not sure why we sometimes receive an empty message.
        // As far as I'm concerned it shouldn't happen, but we'll ignore it
        // and if it's necessary a retransmission of the request will be
        // made later.
        return;
    }

    // Parse the packet, or call the informative
    // parse error display if we fail.
    try {
        pkt = parse(msg);
    } catch (error) {
        return self.emit('error', error);
    }

    // If this message's request id matches one we've sent,
    // cancel any outstanding timeout and call the registered
    // callback.
    entry = self.reqs[pkt.pdu.reqid];
    if (entry) {
        clearRequest(self.reqs, pkt.pdu.reqid);

        if (typeof entry.callback === 'function') {
            if (pkt.pdu.error !== 0) {
                // An error response should be reported as an error to the callback.
                // We try to find the error description, or in worst case call it
                // just "Unknown Error <number>".
                var errorDescr = Object.keys(asn1ber.errors).filter(function (key) {
                    return asn1ber.errors[key] === pkt.pdu.error;
                })[0] || 'Unknown Error ' + pkt.pdu.error;
                return entry.callback(new Error(errorDescr));
            }

            pkt.pdu.varbinds.forEach(function (vb) {
                vb.receiveStamp = now;
                vb.sendStamp = entry.sendStamp;
            });

            entry.callback(null, pkt.pdu.varbinds);
        }
    }
}