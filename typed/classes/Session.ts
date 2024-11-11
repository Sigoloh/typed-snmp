import { EventEmitter } from "node:stream";
import { defaultOptions } from "../consts/consts";
import { msgReceived } from "../helpers/msgReceived";
import { SessionOption } from "../types/SessionOption";
import dgram from "node:dgram";
import { Packet } from "../types/Packet";
import { defaults } from "../helpers/defaults";
import { encode } from "../helpers/encode";
import { clearRequest } from "../helpers/clearRequest";
import { VarBind } from "../types/VarBind";
import { parseOids } from "../helpers/parseOids";
import * as  asn1ber from "../../lib/asn1ber";
import { compareOids } from "../helpers/compareOids";
import { PacketFactory, PDUFactory, VarBindFactory } from "./PacketFactory";
import { SetRequest } from "../types/SetRequest.type";

export class Session extends EventEmitter{
    private _options: Required<SessionOption> = {...defaultOptions};

    private socket: dgram.Socket | undefined = undefined;

    private prevTs: number = 0;

    private counter: number = 0;

    public reqs: any = {};

    constructor(
        private options?: SessionOption | null
    ){
        super()
        if(options){
            this._options = {...this._options, ...this.options};
        }
        
        this.socket = dgram.createSocket(this._options.family)

        const self = this;
        this.socket.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
            msgReceived(msg, rinfo, self)
        });
        this.socket.on('close', function () {
            // Remove the socket so we don't try to send a message on
            // it when it's closed.
            self.socket = undefined;
        });

        this.socket.on('error', function () {
            // Errors will be emitted here as well as on the callback to the send function.
            // We handle them there, so doing anything here is unnecessary.
            // But having no error handler trips up the test suite.
        });

        // If exclusive is false (default), then cluster workers will use the same underlying handle,
        // allowing connection handling duties to be shared.
        // When exclusive is true, the handle is not shared, and attempted port sharing results in an error.
        this.socket.bind({
            port: this._options.bindPort, // unless otherwise specified, get a random port automatically
            exclusive: true // you should not share the same port, otherwise yours packages will be screwed up between workers
        });
    }

    requestId(): number {
        const now = Date.now();

        if (!this.prevTs) {
            this.prevTs = now;
            this.counter = 0;
        }

        if (now === this.prevTs) {
            this.counter += 1;
            if (this.counter > 1023) {
                throw new Error('Request ID counter overflow. Adjust algorithm.');
            }
        } else {
            this.prevTs = now;
            this.counter = 0;
        }

        return ((now & 0x1fffff) << 10) + this.counter;
    };

    sendMsg(pkt: Packet, options: {oid: number[] | string} | (SessionOption | undefined), callback: (err?:any, varbinds?: VarBind[]) => any) {
        let buf: Buffer;
        let reqid: number;
        let retrans = 0;

        let completeOptions: {oid: number[] | string} & Required<SessionOption> = options as unknown as any

        defaults(completeOptions, this._options);

        reqid = this.requestId();
        pkt.pdu.reqid = reqid;

        buf = encode(pkt);
        const self = this;
        function transmit() {
            if (!self.socket || !self.reqs[reqid]) {
                // The socket has already been closed, perhaps due to an error that ocurred while a timeout
                // was scheduled. We can't do anything about it now.
                clearRequest(self.reqs, reqid);
                return;
            } else if (!completeOptions.timeouts[retrans]){
                // If there is no other configured retransmission attempt, we raise a final timeout error
                clearRequest(self.reqs, reqid);
                return callback(new Error('Timeout'));
            }

            // Send the message.
            self.socket.send(buf, 0, buf.length, completeOptions.port, completeOptions.host, function (err: any, bytes: any) {
                var entry = self.reqs[reqid];
                if (err) {;
                    clearRequest(self.reqs, reqid);
                    return callback(err);
                } else if (entry) {
                    // Set timeout and record the timer so that we can (attempt to) cancel it when we receive the reply.
                    entry.sendStamp = Date.now();
                    entry.timeout = setTimeout(transmit, completeOptions.timeouts[retrans]);
                    retrans += 1;
                }
            });
        }

        // Register the callback to call when we receive a reply.
        this.reqs[reqid] = { callback: callback };
        // Transmit the message.
        transmit();
    };

    get(options: {oid: number[] | string}, callback: (err?: any, varbinds?: VarBind[]) => any) {
        let pkt: Packet = (new PacketFactory).create();

        let completeOptions: {oid: number[] | string} & Required<SessionOption> = options as unknown as any;

        defaults(completeOptions, this._options);
        parseOids(completeOptions);

        if (!options.oid) {
            return callback(null, []);
        }
        pkt.community = completeOptions.community;
        pkt.version = completeOptions.version;
        pkt.pdu = (new PDUFactory).create();
        pkt.pdu.varbinds[0].oid = options.oid;
        this.sendMsg(pkt, options, callback);
    };

    set(
        options: {
            requests: SetRequest | SetRequest[]
            requestOptions?: Partial<SessionOption>,
        },
        callback: (err?: any, varbinds?: VarBind[]) => any
    ) {
        let pkt = (new PacketFactory()).create();

        let completeOptions: {oid: number[] | string, value: number | Buffer | string | number[], type: number} & Required<SessionOption> = options as  unknown as any;

        const ensuredRequestArray = Array.isArray(options.requests) ? options.requests : [options.requests];

        defaults(completeOptions, this._options);

        if (!completeOptions.oid) {
            throw new Error('Missing required option `oid`.');
        } else if (completeOptions.value === undefined) {
            throw new Error('Missing required option `value`.');
        } else if (!completeOptions.type) {
            throw new Error('Missing required option `type`.');
        }
        pkt.community = completeOptions.community;
        pkt.version = completeOptions.version;
        pkt.pdu.type = asn1ber.pduTypes.SetRequestPDU;

        for(let i = 0; i < ensuredRequestArray.length; i++){
            parseOids(ensuredRequestArray[i].oid);
            pkt.pdu.varbinds[i].oid = ensuredRequestArray[i].oid;
            pkt.pdu.varbinds[i].type = ensuredRequestArray[i].type;
            pkt.pdu.varbinds[i].value = ensuredRequestArray[i].value;   
        }
        setTimeout(() => {
            this.sendMsg(pkt, completeOptions, callback);
        }, completeOptions.setWakeUpTimeout)
    };

    getAll(options: {oids: number[][] | string, abortOnError: boolean, combinedTimeout: number}, callback: (err?:any, varbinds?: VarBind[]) => any) {
        let results = [] as any[];
        let combinedTimeoutTimer: NodeJS.Timeout;
        let combinedTimeoutExpired = false;

        let completeOptions: {oids: number[][] | string[], abortOnError: boolean, combinedTimeout: number} & Required<SessionOption> = options as unknown as any;

        defaults(completeOptions, {...this.options, abortOnError: false});

        parseOids(completeOptions);

        if (!completeOptions.oids || completeOptions.oids.length === 0) {
            return callback(null, []);
        }

        const self = this;
        function getOne(c: number) {
            let oid: number[] 
            let pkt = (new PacketFactory()).create();
            let vb = (new VarBindFactory()).create();

            pkt.community = completeOptions.community;
            pkt.version = completeOptions.version;
            pkt.pdu.varbinds = [];

            // Push up to 16 varbinds in the same message.
            // The number 16 isn't really that magical, it's just a nice round
            // number that usually seems to fit withing a single packet and gets
            // accepted by the switches I've tested it on.
            for (let m = 0; m < 16 && c < completeOptions.oids.length; m++) {
                vb.oid = completeOptions.oids[c];
                pkt.pdu.varbinds.push(vb);
                c++;
            }

            self.sendMsg(pkt, completeOptions as unknown as { oid: string | number[]; }, function (err, varbinds) {
                if (combinedTimeoutExpired) {
                    return;
                }
                if (options.abortOnError && err) {
                    clearTimeout(combinedTimeoutTimer);
                    callback(err);
                } else {
                    if (varbinds) {
                        results = results.concat(varbinds);
                    }
                    if (c < options.oids.length) {
                        getOne(c);
                    } else {
                        clearTimeout(combinedTimeoutTimer);
                        callback(null, results);
                    }
                }
            });
        }

        if (options.combinedTimeout) {
            var combinedTimeoutEvent = function() {
                combinedTimeoutExpired = true;
                return callback(new Error('Timeout'), results);
            };
            combinedTimeoutTimer = setTimeout(combinedTimeoutEvent, options.combinedTimeout);
        }

        getOne(0);
    };

    getNext(options: {oid: number[] | string}, callback: (err?: any, varbinds?: VarBind[]) => any) {
        let pkt = (new PacketFactory()).create();
        let completeOptions: {oid: number[] | string} & Required<SessionOption> = options as unknown as any;
        defaults(completeOptions, this._options);
        parseOids(options);

        if (!options.oid) {
            return callback(null, []);
        }

        pkt.community = completeOptions.community;
        pkt.version = completeOptions.version;
        pkt.pdu.type = 1;
        pkt.pdu.varbinds[0].oid = options.oid;
        this.sendMsg(pkt, completeOptions, callback);
    };

    getBulk(options: {oid: number[] | string}, callback: (err?: any, varbinds?: VarBind[]) => any){

        let completeOptions: {oid: number[] | string} & Required<SessionOption> = options as unknown as any;

        defaults(completeOptions, this._options);

        parseOids(completeOptions);

        const responses = [] as VarBind[];

        const self = this;
        const getNextCallback = (error?: any, varbind?: VarBind[]) => {
            if(error || !varbind){
                callback(error);
            }else{
                let varbindOid = "";

                if(typeof varbind[0].oid === "string"){
                    varbindOid = "." + varbind[0].oid;
                } else {
                    varbindOid = "." + varbind[0].oid.join(".");
                }

                const definitelyStringOid = typeof options.oid === "string" ? options.oid : options.oid.join(".");

                if(varbindOid.includes(definitelyStringOid)){
                    self.getNext({oid: varbindOid}, getNextCallback)

                    responses.push(...varbind)
                } else {
                    callback(null, responses);
                }
            }
        }

        self.getNext(options, getNextCallback)
    }

    getSubtree(options: {oid: number[] | string, startOid?: number[] | string, combinedTimeout?: number}, callback: (err?: any, varbinds?: VarBind[]) => any) {
        let vbs = [(new VarBindFactory).create()] as VarBind[];
        let combinedTimeoutTimer: NodeJS.Timeout;
        let combinedTimeoutExpired = false;

        defaults(options, this._options);
        parseOids(options);

        if (!options.oid) {
            return callback(null, []);
        }

        options.startOid = options.oid;

        const self = this;

        // Helper to check whether `oid` in inside the tree rooted at
        // `root` or not.
        function inTree(root: number[] | string, oid: number[] | string) {
            if (oid.length <= root.length) {
                return false;
            }
            for (let i = 0; i < root.length; i++) {
                if (oid[i] !== root[i]) {
                    return false;
                }
            }
            return true;
        }

        // Helper to handle the result of getNext and call the user's callback
        // as appropriate. The callback will see one of the following patterns:
        //  - callback([an Error object], undefined) -- an error ocurred.
        //  - callback(null, [a Packet object]) -- data from under the tree.
        //  - callback(null, null) -- end of tree.
        function result(error?: any, varbinds?: VarBind[]) {
            error = error ?? '';
            varbinds = varbinds ?? [] as VarBind[];
            if (combinedTimeoutExpired) {
                return;
            }
            if (error) {
                clearTimeout(combinedTimeoutTimer);
                callback(error);
            } else {
                if (inTree(options.startOid!, varbinds[0].oid)) {
                    if (varbinds[0].value === 'endOfMibView' || varbinds[0].value === 'noSuchObject' || varbinds[0].value === 'noSuchInstance') {
                        clearTimeout(combinedTimeoutTimer);
                        callback(null, vbs);
                    } else if (vbs.length && compareOids(vbs.slice(-1)[0].oid, varbinds[0].oid) !== 1) {
                        return callback(new Error('OID not increasing'));
                    } else {
                        vbs.push(varbinds[0]);
                        var next = { oid: varbinds[0].oid };
                        defaults(next, options);
                        self.getNext(next, result);
                    }
                } else {
                    clearTimeout(combinedTimeoutTimer);
                    callback(null, vbs);
                }
            }
        }

        if (options.combinedTimeout) {
            var combinedTimeoutEvent = function() {
                combinedTimeoutExpired = true;
                return callback(new Error('Timeout'), vbs);
            };
            combinedTimeoutTimer = setTimeout(combinedTimeoutEvent, options.combinedTimeout);
        }

        this.getNext(options, result);
    };

    walk<Type>(options: {oid: number[] | string},  callback: (err?: any, varbinds?: Type[])=> void, formatType?: (varbind: VarBind) => Type,){
        const result = [] as Type[];

        this.getSubtree({oid: options.oid}, (err?: any, varbinds?: VarBind[]) => {
            if(varbinds){
                if(formatType){
                    varbinds.forEach(varbind => {
                        result.push(formatType(varbind))
                    })
                } else {
                    varbinds.forEach(varbind => {
                        if(varbind.type !== asn1ber.types.Null){
                            result.push(varbind as unknown as Type)
                        }
                    })
                }
            }
            callback(null, result);
        })
    }

    close() {
        for (let reqid in this.reqs) {
        if (this.reqs[reqid].callback) {
            this.reqs[reqid].callback(new Error('Cancelled'));
        }
            clearRequest(this.reqs, parseInt(reqid));
        }
        this.socket!.close();
    };

}