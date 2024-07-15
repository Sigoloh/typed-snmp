import { pduTypes } from "../../lib/asn1ber";
import { versions } from "../consts/consts";
import { Packet } from "../types/Packet";
import { PDU } from "../types/PDU";
import { VarBind } from "../types/VarBind";

export class VarBindFactory{
    private varbind = {} as VarBind;

    constructor(
        private values?: VarBind
    ){
        this.varbind.type = 5;
        this.varbind.value = null;
        this.varbind = {...this.varbind, ...this.values};
    }

    create(): VarBind{
        return this.varbind;
    }
}

export class PDUFactory{
    private pdu = {} as PDU

    constructor(
        private values?: PDU
    ){
        this.pdu.type = pduTypes.GetRequestPDU;
        this.pdu.reqid = 1;
        this.pdu.error = 0;
        this.pdu.errorIndex = 0;
        this.pdu.varbinds = [ (new VarBindFactory()).create() ];

        this.pdu = {...this.pdu, ...this.values}
    }

    create(): PDU{
        return this.pdu;
    }
}

export class PacketFactory{
    private packet = {} as Packet

    constructor(
        private values?: Packet
    ){
        this.packet.version = versions.SNMPv2c;
        this.packet.community = 'public';
        this.packet.pdu = (new PDUFactory()).create();
        this.packet = {...this.packet, ...this.values}
    }

    create(): Packet{
        return this.packet;
    }
}


    