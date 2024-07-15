import { OID } from "../types/OID";

export function compareOids (oidA: OID, oidB: OID) {
    var mlen, i;

    // The undefined OID, if there is any, is deemed lesser.
    if (typeof oidA === 'undefined' && typeof oidB !== 'undefined') {
        return 1;
    } else if (typeof oidA !== 'undefined' && typeof oidB === 'undefined') {
        return -1;
    }

    // Check each number part of the OIDs individually, and if there is any
    // position where one OID is larger than the other, return accordingly.
    // This will only check up to the minimum length of both OIDs.
    mlen = Math.min(oidA.length, oidB.length);
    for (i = 0; i < mlen; i++) {
        if (oidA[i] > oidB[i]) {
            return -1;
        } else if (oidB[i] > oidA[i]) {
            return 1;
        }
    }

    // If there is one OID that is longer than the other after the above comparison,
    // consider the shorter OID to be lesser.
    if (oidA.length > oidB.length) {
        return -1;
    } else if (oidB.length > oidA.length) {
        return 1;
    } else {
        // The OIDs are obviously equal.
        return 0;
    }
}