export var types: {[key: string]: number};

export var pduTypes: {[key: string]: number};

export var errors: {[key: string]: number};

export var unittest: any;

export function lengthArray(len: number): number[];

export function wrapper(type: number, contensts: any[]): Buffer;

export function oidInt(val: string): number[];

export function oidArray(oid: number[]): number[];

export function intArray(val: number): number[];

export function encodeIntegerish(val: number, type: number): Buffer;

export function encodeInteger(val: number): Buffer;

export function encodeGauge(val: number): Buffer;

export function encodeCounter(val: number): Buffer;

export function encodeTimeTicks(val: number): Buffer;

export function encodeNull(): Buffer;

export function encodeNoSuchObject(): Buffer;

export function encodeNoSuchInstance(): Buffer;

export function encodeEndOfMibView(): Buffer;

export function encodeSequence(contests: Buffer): Buffer;

export function encodeOctetString(string: string): Buffer;

export function encodeIpAddress(address: string | Buffer): Buffer;

export function encodeOid(oid: number[]): Buffer;

export function encodeRequest(type: number, contents: Buffer): Buffer;

export function typeAndLength(buf: Buffer): {type: number, len: number, header: number};

export function parseInteger(buf: Buffer): number;

export function parseOctetString(buf: Buffer): string;

export function parseOid(buf: Buffer): number[];

export function parseArray(buf: Buffer): number[];

export function parseOpaque(buf: Buffer): string;


