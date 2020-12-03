"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresClient = void 0;
const createError = require("http-errors");
const pg_1 = require("pg");
const transformQuery_1 = require("./utils/transformQuery");
const transformResult_1 = require("./utils/transformResult");
const getColumnTypeData = (field) => {
    if (field.dataTypeSize == -1 && field.dataTypeModifier == -1) {
        return { precision: 2147483647, scale: 0 };
    }
    switch (field.dataTypeID) {
        case 20: // int8
        case 1016: // _int8
            return {
                precision: 19,
                scale: 0,
                isSigned: true
            };
        case 21: // int2
        case 1005: // _int2
            return {
                precision: 5,
                scale: 0,
                isSigned: true
            };
        case 23: // int4
        case 1007: // _int4
        case 26: // oid
        case 1028: // _oid
            return {
                precision: 10,
                scale: 0,
                isSigned: true
            };
        case 700: // float4
        case 1021: // _float4
            return {
                precision: 8,
                scale: 8,
                isSigned: true
            };
        case 701: // float8
        case 1022: // _float8
            return {
                precision: 17,
                scale: 17,
                isSigned: true
            };
        case 1700: // numeric
        case 1231: // _numeric
            return {
                precision: ((field.dataTypeModifier - 4) >> 16) & 65535,
                scale: (field.dataTypeModifier - 4) & 65535,
                isSigned: true
            };
        default:
            return {
                precision: 2147483647,
                scale: 0,
                isCaseSensitive: true
            };
    }
};
class PostgresClient {
    constructor(config) {
        this.config = config;
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            this.client = new pg_1.Client(this.config);
            yield this.client.connect();
            return this;
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.client.end();
        });
    }
    beginTransaction() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.query({ query: 'BEGIN' });
        });
    }
    commitTransaction() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.query({ query: 'COMMIT' });
        });
    }
    rollbackTransaction() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.query({ query: 'ROLLBACK' });
        });
    }
    executeSql({ sqlStatements }) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.query({ query: sqlStatements });
            return {
                sqlStatementResults: []
            };
        });
    }
    executeStatement({ sql, parameters, includeResultMetadata = false }) {
        return __awaiter(this, void 0, void 0, function* () {
            const { query, values } = transformQuery_1.transformQuery(sql, parameters);
            const result = yield this.query({ query, values });
            return {
                columnMetadata: includeResultMetadata ? yield this.buildColumnMetadata(result.fields) : undefined,
                records: transformResult_1.transformResult(result),
                numberOfRecordsUpdated: result.command === 'UPDATE' ? result.rowCount : 0
            };
        });
    }
    batchExecuteStatement({ sql, parameterSets = [] }) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(parameterSets.map((parameters) => {
                const { query, values } = transformQuery_1.transformQuery(sql, parameters);
                return this.query({ query, values });
            }));
            return {
                updateResults: []
            };
        });
    }
    query({ query, values }) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.client.query({ text: query, values, rowMode: 'array' });
            }
            catch (error) {
                throw createError(400, `${error.severity}: ${error.message}\n  Position: ${error.position}`);
            }
        });
    }
    buildColumnMetadata(fields) {
        return __awaiter(this, void 0, void 0, function* () {
            const [typeMetadata, tableMetadata] = yield Promise.all([
                this.fetchTypeMetadata(fields),
                this.fetchTableMetadata(fields)
            ]);
            return fields.map((field, index) => (Object.assign(Object.assign(Object.assign({ arrayBaseColumnType: 0, isAutoIncrement: false, isCaseSensitive: false, isCurrency: false, isSigned: false, schemaName: '', tableName: '', nullable: 0, name: field.name, label: field.name }, typeMetadata[index]), tableMetadata[index]), getColumnTypeData(field))));
        });
    }
    fetchTypeMetadata(fields) {
        return __awaiter(this, void 0, void 0, function* () {
            const oids = [...new Set(fields.map((field) => field.dataTypeID))];
            const query = {
                text: `SELECT oid AS "type", typname AS "typeName" FROM pg_type WHERE oid = ANY($1::oid[])`,
                values: [oids]
            };
            const result = yield this.client.query(query);
            return fields.map((field) => {
                const { type, typeName } = result.rows.find(({ type }) => type === field.dataTypeID);
                return { type, typeName };
            });
        });
    }
    fetchTableMetadata(fields) {
        return __awaiter(this, void 0, void 0, function* () {
            const oids = [...new Set(fields.map((field) => field.tableID))];
            const query = {
                text: `
        SELECT
          c.oid AS "tableID",
          a.attnum AS "columnID",
          c.relname AS "tableName",
          CASE a.attnotnull
            WHEN true THEN 0
            WHEN false then 1
          END AS "nullable",
          CASE
            WHEN pg_get_serial_sequence(n.nspname||'.'||c.relname, a.attname) IS NULL
            THEN false
            ELSE true
          END AS "isAutoIncrement"
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          JOIN pg_attribute a ON attrelid = c.oid
          WHERE c.oid = ANY($1::oid[]) AND NOT a.attisdropped
          ORDER BY a.attnum ASC
      `,
                values: [oids]
            };
            const result = yield this.client.query(query);
            return fields.map((field) => {
                const row = result.rows.find(({ tableID, columnID }) => tableID === field.tableID && columnID === field.columnID);
                if (row) {
                    const { tableName, nullable, isAutoIncrement } = result.rows.find(({ tableID, columnID }) => tableID === field.tableID && columnID === field.columnID);
                    return {
                        nullable,
                        tableName,
                        isAutoIncrement
                    };
                }
                else {
                    return {};
                }
            });
        });
    }
}
exports.PostgresClient = PostgresClient;
//# sourceMappingURL=PostgresClient.js.map