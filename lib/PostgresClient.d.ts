import * as RDSDataService from 'aws-sdk/clients/rdsdataservice';
import { ClientConfig as UpstreamPostgresClientConfig, Client as UpstreamPostgresClient } from 'pg';
import { Client, ExecuteSqlRequest, ExecuteStatementRequest, BatchExecuteStatementRequest } from './Client';
export declare type PostgresClientConfig = UpstreamPostgresClientConfig;
export declare class PostgresClient implements Client {
    protected client: UpstreamPostgresClient;
    protected config: string | PostgresClientConfig;
    constructor(config: string | PostgresClientConfig);
    connect(): Promise<PostgresClient>;
    disconnect(): Promise<void>;
    beginTransaction(): Promise<void>;
    commitTransaction(): Promise<void>;
    rollbackTransaction(): Promise<void>;
    executeSql({ sqlStatements }: ExecuteSqlRequest): Promise<RDSDataService.Types.ExecuteSqlResponse>;
    executeStatement({ sql, parameters, includeResultMetadata }: ExecuteStatementRequest): Promise<RDSDataService.Types.ExecuteStatementResponse>;
    batchExecuteStatement({ sql, parameterSets }: BatchExecuteStatementRequest): Promise<RDSDataService.Types.BatchExecuteStatementResponse>;
    private query;
    private buildColumnMetadata;
    private fetchTypeMetadata;
    private fetchTableMetadata;
}
