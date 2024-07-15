export function parseSingleOid(oid: string | number[]) {
    if (typeof oid !== 'string') {
        return oid;
    }

    oid = oid.split('.')
        .filter(function (s) {
            return s.length > 0;
        })
        .map(function (s) {
            return parseInt(s, 10);
        });

    return oid;
}
