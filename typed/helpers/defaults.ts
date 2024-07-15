export function defaults(targ: any, _defs: any) {
    [].slice.call(arguments, 1).forEach(function (def) {
        Object.keys(def).forEach(function (key) {
            if (!targ.hasOwnProperty(key)) {
                targ[key] = def[key];
            }
        });
    });
}