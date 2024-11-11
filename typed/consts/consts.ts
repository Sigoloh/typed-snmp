import { SessionOption } from "../types/SessionOption";

export const versions = {
    SNMPv1: 0,
    SNMPv2c: 1
};

export const defaultOptions = {
    host: 'localhost',
    port: 161,
    bindPort: 0,
    community: 'public',
    family: 'udp4',
    timeouts: [ 5000, 5000, 5000, 5000 ],
    version: versions.SNMPv2c,
    setWakeUpTimeout: 0
} as Required<SessionOption>;