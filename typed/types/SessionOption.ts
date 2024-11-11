export type SessionOption = {
    host: string,
    port: number,
    bindPort?: number,
    community: string,
    family?: "udp4" | "udp6",
    timeouts?: number[],
    version?: number,
    setWakeUpTimeout?: number,
    msgReceived?:  (msg: Buffer, rinfo: any) => any
}