import { VarBind } from "./VarBind";

export type PDU = {
    type: number;
    reqid: number;
    error: number;
    errorIndex: number;
    varbinds: VarBind[];
}
