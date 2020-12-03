"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformResult = void 0;
const pg_1 = require("pg");
const transformStringValue = (value) => {
    if (typeof value === 'string') {
        return value;
    }
    else {
        return JSON.stringify(value);
    }
};
const parseTimestamp = (value) => {
    return new Date(value).toISOString();
};
const parseLongValue = (value) => {
    if (typeof value === 'string') {
        return parseInt(value);
    }
    else {
        return value;
    }
};
const transformArray = (typeId, array) => {
    if (Array.isArray(array[0])) {
        return { arrayValues: array.map((value) => transformArray(typeId, value)) };
    }
    switch (typeId) {
        case 1000:
            return { booleanValues: array };
        case 1115:
        case 1182:
        case 1185:
            return { stringValues: array.map((value) => parseTimestamp(value)) };
        case 1005:
        case 1007:
        case 1028:
            return { longValues: array.map((value) => parseLongValue(value)) };
        case 1021:
        case 1022:
            return { doubleValues: array };
        default:
            return { stringValues: array.map((value) => transformStringValue(value)) };
    }
};
const transformValue = (field, value) => {
    if (value === null) {
        return { isNull: true };
    }
    else {
        if (Array.isArray(value)) {
            return { arrayValue: transformArray(field.dataTypeID, value) };
        }
        switch (field.dataTypeID) {
            case pg_1.types.builtins.BOOL:
                return { booleanValue: value };
            case pg_1.types.builtins.BYTEA:
                return { blobValue: value };
            case pg_1.types.builtins.INT2:
            case pg_1.types.builtins.INT4:
            case pg_1.types.builtins.INT8:
                return { longValue: parseLongValue(value) };
            case pg_1.types.builtins.FLOAT4:
            case pg_1.types.builtins.FLOAT8:
                return { doubleValue: value };
            case pg_1.types.builtins.TIMESTAMP:
            case pg_1.types.builtins.TIMESTAMPTZ:
                return { stringValue: parseTimestamp(value.toString()) };
            default:
                return { stringValue: transformStringValue(value) };
        }
    }
};
exports.transformResult = (result) => {
    return result.rows.map((columns) => {
        return columns.map((value, index) => {
            const field = result.fields[index];
            return transformValue(field, value);
        });
    });
};
//# sourceMappingURL=transformResult.js.map