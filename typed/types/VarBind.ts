export type VarBind = {
    type: number;
    value: number | null | number[] | Buffer | string
    parsedValue?: number | null | number[] | Buffer | string
    oid: string | number[]
    valueRaw: any
    valueHex: string
    requestId: number
    receiveStamp: number
    sendStamp: number
}