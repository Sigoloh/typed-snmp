export function concatBuffers(buffers: Buffer[]) {
    let total = 0;

    let cur = 0;

    let buf: Buffer;

    // First we calculate the total length,
    total = buffers.reduce(function (tot, b) {
        return tot + b.length;
    }, 0);

    // then we allocate a new Buffer large enough to contain all data,
    buf = Buffer.alloc(total);

    buffers.forEach(function (buffer) {
        // finally we copy the data into the new larger buffer.
        buffer.copy(buf, cur, 0);
        cur += buffer.length;
    });

    return buf;
}