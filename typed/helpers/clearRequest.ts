export function clearRequest(reqs: {[key: number]: any}, reqid: number) {
    const entry = reqs[reqid];
    if (entry) {
        if (entry.timeout) {
            clearTimeout(entry.timeout);
        }
        delete reqs[reqid];
    }
}