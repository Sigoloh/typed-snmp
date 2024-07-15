import { PDU } from "./PDU";

export type Packet = {
    version: number;
    community: string;
    pdu: PDU;
}