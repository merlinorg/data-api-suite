import * as RDSDataService from 'aws-sdk/clients/rdsdataservice';
export interface TransformedQuery {
    query: string;
    values?: unknown[];
}
export declare const transformQuery: (query: string, parameters?: RDSDataService.Types.SqlParameter[]) => TransformedQuery;
