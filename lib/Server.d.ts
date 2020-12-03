/// <reference types="node" />
import * as express from 'express';
import * as http from 'http';
import { Client } from './Client';
import { PostgresClientConfig } from './PostgresClient';
export declare type engines = 'postgresql';
export interface ServerConfig {
    hostname?: string;
    port?: number;
}
export interface PostgresConnectionOptions extends PostgresClientConfig {
    engine: 'postgresql';
}
export declare type DbConfig = PostgresConnectionOptions;
export interface ServerOptions {
    database: DbConfig;
    server?: ServerConfig;
    logger?: Function;
}
export declare class Server {
    protected app: express.Express;
    protected httpServer: http.Server;
    protected port: number;
    protected hostname: string;
    protected logger: Function;
    protected logLevel: string;
    protected engine: engines;
    protected dbConfig: PostgresConnectionOptions;
    protected pool: {
        [id: string]: Client;
    };
    constructor({ logger, server, database }: ServerOptions);
    start(): Promise<Server>;
    stop(): Promise<void>;
    private createClient;
    private getClient;
    private executeSql;
    private executeStatement;
    private batchExecuteStatement;
    private beginTransaction;
    private commitTransaction;
    private rollbackTransaction;
    private setRequestId;
    private handleError;
    private log;
}
