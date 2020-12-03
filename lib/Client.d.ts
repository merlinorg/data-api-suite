import * as RDSDataService from 'aws-sdk/clients/rdsdataservice';
export interface ExecuteSqlRequest {
    sqlStatements: RDSDataService.Types.SqlStatement;
}
export interface ExecuteStatementRequest {
    sql: RDSDataService.Types.SqlStatement;
    parameters?: RDSDataService.Types.SqlParametersList;
    includeResultMetadata?: boolean;
}
export interface BatchExecuteStatementRequest {
    sql: RDSDataService.Types.SqlStatement;
    parameterSets?: RDSDataService.Types.SqlParameterSets;
}
export declare abstract class Client {
    abstract connect(): Promise<Client>;
    abstract disconnect(): Promise<void>;
    abstract beginTransaction(): Promise<void>;
    abstract commitTransaction(): Promise<void>;
    abstract rollbackTransaction(): Promise<void>;
    abstract executeSql(params: ExecuteSqlRequest): Promise<RDSDataService.Types.ExecuteSqlResponse>;
    abstract executeStatement(params: ExecuteStatementRequest): Promise<RDSDataService.Types.ExecuteStatementResponse>;
    abstract batchExecuteStatement(params: BatchExecuteStatementRequest): Promise<RDSDataService.Types.BatchExecuteStatementResponse>;
}
export declare class QueryError extends Error {
}
