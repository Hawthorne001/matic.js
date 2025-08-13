import { BaseContract } from "../abstracts";
import { ITransactionRequestConfig, ITransactionReceipt, ITransactionData, IBlock, IBlockWithTransaction, IJsonRpcRequestPayload, IJsonRpcResponse, ITransactionWriteResult } from "../interfaces";
import { Logger } from "../utils";

export abstract class BaseWeb3Client {
    abstract name: string;

    constructor(public logger: Logger) {

    }

    abstract getContract(address: string, abi: any): BaseContract;

    abstract read(config: ITransactionRequestConfig): Promise<string>;

    abstract write(config: ITransactionRequestConfig): ITransactionWriteResult;
    abstract getGasPrice(): Promise<string>;
    abstract estimateGas(config: ITransactionRequestConfig): Promise<number>;
    abstract getChainId(): Promise<number>;
    abstract getTransactionCount(address: string, blockNumber: any): Promise<number>;

    abstract getTransaction(transactionHash: string): Promise<ITransactionData>;
    abstract getTransactionReceipt(transactionHash: string): Promise<ITransactionReceipt>;
    // abstract extend(property: string, methods: IMethod[])

    abstract getBlock(blockHashOrBlockNumber): Promise<IBlock>;
    abstract getBlockWithTransaction(blockHashOrBlockNumber): Promise<IBlockWithTransaction>;
    abstract hexToNumber(value: any): number;
    abstract hexToNumberString(value: any): string;
    abstract getBalance(address: string): Promise<string>;
    abstract getAccounts(): Promise<string[]>;
    abstract signTypedData(signer: string, typedData: object): Promise<string>;

    async getRootHash?(startBlock: number, endBlock: number) {
        try {
            const payload = await this.sendRPCRequest({
                jsonrpc: '2.0',
                method: 'bor_getRootHash',
                params: [Number(startBlock), Number(endBlock)],
                id: new Date().getTime()
            });
            if (payload && payload.result) {
                return String(payload.result);
            }
            throw new Error('No result found for bor_getRootHash');
        } catch (error) {
            const payload = await this.sendRPCRequest({
                jsonrpc: '2.0',
                method: 'eth_getRootHash',
                params: [Number(startBlock), Number(endBlock)],
                id: new Date().getTime()
            });
            if (payload && payload.result) {
                return String(payload.result);
            }
            throw new Error('No result found for bor_getRootHash and eth_getRootHash');
        }
    }

    getAccountsUsingRPC_() {
        return this.sendRPCRequest({
            jsonrpc: '2.0',
            method: 'eth_accounts',
            params: [],
            id: new Date().getTime()
        }).then(payload => {
            return payload.result;
        });
    }

    abstract sendRPCRequest(request: IJsonRpcRequestPayload): Promise<IJsonRpcResponse>;

    abstract encodeParameters(params: any[], types: any[]): string;
    abstract decodeParameters(hexString: string, types: any[]): any[];
    abstract etheriumSha3(...value): string;

}
