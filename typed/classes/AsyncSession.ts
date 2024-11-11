import { SessionOption } from "../types/SessionOption";
import { Session } from "./Session";
import { defaultOptions } from "../consts/consts";
import { VarBind } from "../types/VarBind";
import { SetRequest } from "../types/SetRequest.type";

export class AsyncSession{
    private _options: Required<SessionOption> = {...defaultOptions};
    private session: Session;
    constructor(
        private options?: SessionOption | null
    ){
        if(this.options){
            this._options = {...this._options, ...this.options}
        }

        this.session = new Session({...this._options});
    }

    async get(options: {oid: number[] | string}): Promise<VarBind[]>{
        return new Promise((resolve, reject) => {
            this.session.get(options, (err?: any, varbinds?: VarBind[]) => {
                if(err){
                    reject(err)
                    return;
                }
                if(varbinds){
                    resolve(varbinds);
                }

                reject("No data");
            })
        })
    } 

    async set(
        options: {
            requestOptions?: Partial<SessionOption>,
            requests: SetRequest | SetRequest[]
        }
    ): Promise<VarBind[]>{
        return new Promise((resolve, reject) => {
            this.session.set(options, (err?: any, varbinds?: VarBind[]) => {
                if(err){
                    reject(err)
                    return;
                }

                if(varbinds){
                    resolve(varbinds)
                    return;
                }

                reject("No Data");
            })
        })
    }

    async getAll(options: {oids: number[][] | string, abortOnError: boolean, combinedTimeout: number}): Promise<VarBind[]>{
        return new Promise((resolve, reject) => {
            this.session.getAll(options, (err?: any, varbinds?: VarBind[]) => {
                if(err){
                    reject(err)
                    return;
                }

                if(varbinds){
                    resolve(varbinds)
                    return;
                }

                reject("No Data")
                return;
            })
        })
    }

    async getNext(options: {oid: number[] | string}): Promise<VarBind[]>{
        return new Promise((resolve, reject) => {
            this.session.getNext(options, (err?: any, varbinds?: any) => {
                if(err){
                    reject(err);
                    return;
                }

                if(varbinds){
                    resolve(varbinds);
                    return;
                }

                reject("No Data");
                return;
            })
        })
    }

    async getBulk(options: {oid: number[] | string}): Promise<VarBind[]>{
        return new Promise((resolve, reject) => {
            this.session.getBulk(options, (err?: any, varbinds?: VarBind[]) => {
                if(err){
                    reject(err);
                    return;
                }

                if(varbinds){
                    resolve(varbinds);
                    return;
                }

                reject("No data");
                return;
            })
        })
    }

    async getSubtree(options: {oid: number[] | string, startOid?: number[] | string, combinedTimeout?: number}): Promise<VarBind[]>{
        return new Promise((resolve, reject) => {
            this.session.getSubtree(options, (err?: any, varbinds?: VarBind[]) => {
                if(err){
                    reject(err)
                    return
                }

                if(varbinds){
                    resolve(varbinds);
                    return;
                }

                reject("No Data")
                return;
            })
        })
    }

    async walk<Type>(options: {oid: number[] | string}, formatType?: (varbind: VarBind) => Type): Promise<Type[]>{
        return new Promise((resolve, reject) => {
            this.session.walk<Type>(options,(err?: any, varbinds?: Type[]) => {
                if(err){
                    reject(err)
                    return
                }

                if(varbinds){
                    resolve(varbinds)
                    return
                }
            } ,formatType)
        })
    }

    async close(): Promise<void>{
        return new Promise((resolve, reject) => {
            resolve(this.session.close());
        })
    }
}