import * as RDSDataService from 'aws-sdk/clients/rdsdataservice';
import { QueryResult } from 'pg';
export declare const transformResult: (result: QueryResult) => RDSDataService.SqlRecords;
