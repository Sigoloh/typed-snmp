import { parseSingleOid } from "./parseSingleOid";

export function parseOids(options: any) {
    if (options.oid) {
        options.oid = parseSingleOid(options.oid);
    }
    if (options.oids) {
        options.oids = options.oids.map(parseSingleOid);
    }
}