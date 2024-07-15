import { versions } from "../consts/consts";
import * as asn1ber from "../../lib/asn1ber";
import { concatBuffers } from "./concatBuffers";
import { encodeRequest, encodeSequence } from "../../lib/asn1ber";
import { Packet } from "../types/Packet";

export function encode(pkt: Packet) {
    let version: any
    let community: any
    let reqid: any
    let err: any
    let erridx: any
    let vbs: any
    let pdu: any 
    let message: any

    // We only support SNMPv1 and SNMPv2c, so enforce those version stamps.
    if (pkt.version !== versions.SNMPv1 && pkt.version !== versions.SNMPv2c) {
        throw new Error('Only SNMPv1 and SNMPv2c are supported.');
    }
    // Encode the message header fields.
    version = asn1ber.encodeInteger(pkt.version);
    community = asn1ber.encodeOctetString(pkt.community);

    // Encode the PDU header fields.
    reqid = asn1ber.encodeInteger(pkt.pdu.reqid);
    err = asn1ber.encodeInteger(pkt.pdu.error);
    erridx = asn1ber.encodeInteger(pkt.pdu.errorIndex);

    // Encode the PDU varbinds.
    vbs = [];
    pkt.pdu.varbinds.forEach(function (vb: any) {
        var oid = asn1ber.encodeOid(vb.oid)
        let val: any;

        if (vb.type === asn1ber.types.Null || vb.value === null) {
            val = asn1ber.encodeNull();
        } else if (vb.type === asn1ber.types.Integer) {
            val = asn1ber.encodeInteger(vb.value);
        } else if (vb.type === asn1ber.types.Gauge) {
            val = asn1ber.encodeGauge(vb.value);
        } else if (vb.type === asn1ber.types.IpAddress) {
            val = asn1ber.encodeIpAddress(vb.value);
        } else if (vb.type === asn1ber.types.OctetString) {
            val = asn1ber.encodeOctetString(vb.value);
        } else if (vb.type === asn1ber.types.ObjectIdentifier) {
            val = asn1ber.encodeOid(vb.value);
        } else if (vb.type === asn1ber.types.Counter) {
            val = asn1ber.encodeCounter(vb.value);
        } else if (vb.type === asn1ber.types.TimeTicks) {
            val = asn1ber.encodeTimeTicks(vb.value);
        } else if (vb.type === asn1ber.types.NoSuchObject) {
            val = asn1ber.encodeNoSuchObject();
        } else if (vb.type === asn1ber.types.NoSuchInstance) {
            val = asn1ber.encodeNoSuchInstance();
        } else if (vb.type === asn1ber.types.EndOfMibView) {
            val = asn1ber.encodeEndOfMibView();
        } else {
            throw new Error('Unknown varbind type "' + vb.type + '" in encoding.');
        }
        vbs.push(encodeSequence(concatBuffers([oid, val])));
    });

    // Concatenate all the varbinds together.
    vbs = encodeSequence(concatBuffers(vbs));

    // Create the PDU by concatenating the inner fields and adding a request structure around it.
    pdu = encodeRequest(pkt.pdu.type, concatBuffers([reqid, err, erridx, vbs]));

    // Create the message by concatenating the header fields and the PDU.
    message = encodeSequence(concatBuffers([version, community, pdu]));

    return message;
}