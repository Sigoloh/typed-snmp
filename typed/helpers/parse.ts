import  { parseArray, parseInteger, parseOctetString, parseOid, parseOpaque, typeAndLength, types } from '../../lib/asn1ber';
import { PacketFactory, VarBindFactory } from '../classes/PacketFactory';


export function parse(buf: any) {
    let pkt = (new PacketFactory()).create();
    let bvb
    let vb = (new VarBindFactory()).create();
    let hdr

    // First we have a sequence marker (two bytes).
    // We don't care about those, so cut them off.
    hdr = typeAndLength(buf);
    buf = buf.slice(hdr.header);

    // Then comes the version field (integer). Parse it and slice it.
    pkt.version = parseInteger(buf.slice(0, buf[1] + 2));
    buf = buf.slice(2 + buf[1]);

    // We then get the community. Parse and slice.
    pkt.community = parseOctetString(buf.slice(0, buf[1] + 2));
    buf = buf.slice(2 + buf[1]);

    // Here's the PDU structure. We're interested in the type. Slice the rest.
    hdr = typeAndLength(buf);
    pkt.pdu.type = hdr.type - 0xA0;
    buf = buf.slice(hdr.header);

    // The request id field.
    pkt.pdu.reqid = parseInteger(buf.slice(0, buf[1] + 2));
    buf = buf.slice(2 + buf[1]);

    // The error field.
    pkt.pdu.error = parseInteger(buf.slice(0, buf[1] + 2));
    buf = buf.slice(2 + buf[1]);

    // The error index field.
    pkt.pdu.errorIndex = parseInteger(buf.slice(0, buf[1] + 2));
    buf = buf.slice(2 + buf[1]);

    // Here's the varbind list. Not interested.
    hdr = typeAndLength(buf);
    buf = buf.slice(hdr.header);

    // Now comes the varbinds. There might be many, so we loop for as long as we have data.
    pkt.pdu.varbinds = [];
    while (buf[0] === types.Sequence) {
        // Slice off the sequence header.
        hdr = typeAndLength(buf);
        bvb = buf.slice(hdr.header, hdr.len + hdr.header);

        // Parse and save the ObjectIdentifier.
        vb.oid = parseOid(bvb);

        // Parse the value. We use the type marker to figure out
        // what kind of value it is and call the appropriate parser
        // routine. For the SNMPv2c error types, we simply set the
        // value to a text representation of the error and leave handling
        // up to the user.
        var vb_name_hdr = typeAndLength(bvb);
        bvb = bvb.slice(vb_name_hdr.header + vb_name_hdr.len);
        var vb_value_hdr = typeAndLength(bvb);
        vb.type = vb_value_hdr.type;
        if (vb.type === types.Null) {
            // Null type.
            vb.value = null;
        } else if (vb.type === types.OctetString) {
            // Octet string type.
            vb.value = parseOctetString(bvb);
        } else if (vb.type === types.Integer ||
            vb.type === types.Counter ||
            vb.type === types.Counter64 ||
            vb.type === types.TimeTicks ||
            vb.type === types.Gauge) {
            // Integer type and it's derivatives that behave in the same manner.
            vb.value = parseInteger(bvb);
        } else if (vb.type === types.ObjectIdentifier) {
            // Object identifier type.
            vb.value = parseOid(bvb);
        } else if (vb.type === types.IpAddress) {
            // IP Address type.
            vb.value = parseArray(bvb);
        } else if (vb.type === types.Opaque) {
            // Opaque type. The 'parsing' here is very light; basically we return a
            // string representation of the raw bytes in hex.
            vb.value = parseOpaque(bvb);
        } else if (vb.type === types.EndOfMibView) {
            // End of MIB view error, returned when attempting to GetNext beyond the end
            // of the current view.
            vb.value = 'endOfMibView';
        } else if (vb.type === types.NoSuchObject) {
            // No such object error, returned when attempting to Get/GetNext an OID that doesn't exist.
            vb.value = 'noSuchObject';
        } else if (vb.type === types.NoSuchInstance) {
            // No such instance error, returned when attempting to Get/GetNext an instance
            // that doesn't exist in a given table.
            vb.value = 'noSuchInstance';
        } else {
            // Something else that we can't handle, so throw an error.
            // The error will be caught and presented in a useful manner on stderr,
            // with a dump of the message causing it.
            throw new Error('Unrecognized value type ' + vb.type);
        }

        // Take the raw octet string value and preseve it as a buffer and hex string.
        vb.valueRaw = bvb.slice(vb_value_hdr.header, vb_value_hdr.header + vb_value_hdr.len);
        vb.valueHex = vb.valueRaw.toString('hex');

        // Add the request id to the varbind (even though it doesn't really belong)
        // so that it will be availble to the end user.
        vb.requestId = pkt.pdu.reqid;

        // Push whatever we parsed to the varbind list.
        pkt.pdu.varbinds.push(vb);

        // Go fetch the next varbind, if there seems to be any.
        if (buf.length > hdr.header + hdr.len) {
            buf = buf.slice(hdr.header + hdr.len);
        } else {
            break;
        }
    }

    return pkt;
}