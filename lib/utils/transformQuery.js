"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformQuery = void 0;
const createError = require("http-errors");
const typeHint = (hint = 'text') => {
    switch (hint) {
        case 'DATE':
            return 'date';
        case 'DOUBLE':
            return 'float';
        case 'TIME':
            return 'time';
        case 'TIMESTAMP':
            return 'timestamp';
        default:
            return hint;
    }
};
const getValueFromArrayValue = (index, value, hint, depth = 1) => {
    const suffix = [...Array(depth)].map(() => '[]').join('');
    if ('arrayValues' in value) {
        const result = value
            .arrayValues
            .map((values) => getValueFromArrayValue(index, values, hint, depth + 1))
            .reduce(([id, values], [currentId, currentValues]) => [
            id === null ? currentId : id,
            [...values, currentValues]
        ], [null, []]);
        return result;
    }
    if ('booleanValues' in value) {
        return [`$${index}::boolean${suffix}`, value.booleanValues.map((v) => v.toString())];
    }
    if ('doubleValues' in value) {
        return [`$${index}::float${suffix}`, value.doubleValues.map((v) => v.toString())];
    }
    if ('longValues' in value) {
        return [`$${index}::int${suffix}`, value.longValues.map((v) => v.toString())];
    }
    if ('stringValues' in value) {
        const type = typeHint(hint);
        return [`$${index}::${type}${suffix}`, value.stringValues.map((v) => v.toString())];
    }
};
const getValueFromParameter = (index, parameter) => {
    const { value } = parameter;
    if ('arrayValue' in value) {
        return getValueFromArrayValue(index, value.arrayValue, parameter.typeHint);
    }
    if ('isNull' in value) {
        return [`$${index}`, null];
    }
    if ('blobValue' in value) {
        return [`$${index}::bytea`, value.blobValue.toString()];
    }
    if ('booleanValue' in value) {
        return [`$${index}::boolean`, value.booleanValue.toString()];
    }
    if ('doubleValue' in value) {
        return [`$${index}::float`, value.doubleValue.toString()];
    }
    if ('longValue' in value) {
        return [`$${index}::int`, value.longValue.toString()];
    }
    if ('stringValue' in value) {
        const type = typeHint(parameter.typeHint);
        return [`$${index}::${type}`, value.stringValue.toString()];
    }
};
exports.transformQuery = (query, parameters) => {
    query = query.split(/;(?=([^"']*"[^"']*")*[^"']*$)/)[0].trim();
    if (parameters === undefined) {
        return { query };
    }
    return parameters.reduce(({ query, values }, parameter, index) => {
        if (typeof parameter.name !== 'string' || parameter.name.trim() === '') {
            throw createError(400, 'Named parameter name is empty');
        }
        const [id, value] = getValueFromParameter(index + 1, parameter);
        const regx = new RegExp(`:${parameter.name}\\b`, 'g');
        return {
            query: query.replace(regx, id),
            values: [...values, value]
        };
    }, { query, values: [] });
};
//# sourceMappingURL=transformQuery.js.map