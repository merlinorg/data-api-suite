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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const express = require("express");
const bodyParser = require("body-parser");
const uuid = require("uuid/v4");
const createError = require("http-errors");
const PostgresClient_1 = require("./PostgresClient");
const DEFAULT_PORT = 8080;
const DEFAULT_HOSTNAME = 'localhost';
class Server {
    constructor({ logger = console.info, server, database }) {
        this.logger = logger;
        this.port = server.port || DEFAULT_PORT;
        this.hostname = server.hostname || DEFAULT_HOSTNAME;
        this.dbConfig = database;
        this.pool = {};
        this.app = express();
        this.app.use(bodyParser.json());
        this.app.use(this.setRequestId.bind(this));
        this.app.post('/Execute', this.executeStatement.bind(this));
        this.app.post('/BatchExecute', this.batchExecuteStatement.bind(this));
        this.app.post('/ExecuteSql', this.executeSql.bind(this));
        this.app.post('/BeginTransaction', this.beginTransaction.bind(this));
        this.app.post('/CommitTransaction', this.commitTransaction.bind(this));
        this.app.post('/RollbackTransaction', this.rollbackTransaction.bind(this));
        this.app.use(this.handleError.bind(this));
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise((resolve) => {
                this.httpServer = this.app.listen(this.port, this.hostname, () => {
                    this.log(`listening on http://${this.hostname}:${this.port}`);
                    resolve();
                });
            });
            return this;
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise((resolve, reject) => {
                this.httpServer.close((error) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve();
                });
            });
        });
    }
    createClient({ database = this.dbConfig.database, transactionId }) {
        return __awaiter(this, void 0, void 0, function* () {
            const _a = this.dbConfig, { engine } = _a, config = __rest(_a, ["engine"]);
            let client;
            if (engine === 'postgresql') {
                client = yield new PostgresClient_1.PostgresClient(Object.assign(Object.assign({}, config), { database })).connect();
            }
            else {
                throw createError(503, `"${engine}" is not supported`);
            }
            if (transactionId !== undefined) {
                this.pool[transactionId] = client;
            }
            return client;
        });
    }
    getClient({ database = this.dbConfig.database, transactionId }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (transactionId !== undefined) {
                if (transactionId in this.pool) {
                    return this.pool[transactionId];
                }
                else {
                    throw createError(400, `Transaction ${transactionId} is not found`);
                }
            }
            else {
                return this.createClient({ database });
            }
        });
    }
    executeSql(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const { database, sqlStatements } = req.body;
            try {
                if (typeof sqlStatements !== 'string' || sqlStatements.trim() === '') {
                    throw createError(400, 'SQL is empty');
                }
                const client = yield this.createClient({ database });
                try {
                    this.log(`[executeSql] ${sqlStatements}`);
                    const result = yield client.executeSql({ sqlStatements });
                    res.status(200).send(result);
                }
                finally {
                    yield client.disconnect();
                }
            }
            catch (error) {
                next(error);
            }
        });
    }
    executeStatement(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const _a = req.body, { database, transactionId, sql } = _a, rest = __rest(_a, ["database", "transactionId", "sql"]);
            try {
                if (typeof sql !== 'string' || sql.trim() === '') {
                    throw createError(400, 'SQL is empty');
                }
                const client = yield this.getClient({ database, transactionId });
                try {
                    this.log(`[executeStatement] ${sql}`);
                    const result = yield client.executeStatement(Object.assign({ sql }, rest));
                    res.status(200).json(result);
                }
                finally {
                    if (transactionId === undefined) {
                        yield client.disconnect();
                    }
                }
            }
            catch (error) {
                next(error);
            }
        });
    }
    batchExecuteStatement(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const _a = req.body, { database, transactionId, sql } = _a, rest = __rest(_a, ["database", "transactionId", "sql"]);
            try {
                if (typeof sql !== 'string' || sql.trim() === '') {
                    throw createError(400, 'SQL is empty');
                }
                const client = yield this.getClient({ database, transactionId });
                try {
                    this.log(`[batchExecuteStatement] ${sql}`);
                    const result = yield client.batchExecuteStatement(Object.assign({ sql }, rest));
                    res.status(200).send(result);
                }
                finally {
                    if (transactionId === undefined) {
                        yield client.disconnect();
                    }
                }
            }
            catch (error) {
                return next(error);
            }
        });
    }
    beginTransaction(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const { database } = req.body;
            const transactionId = Buffer.from(uuid()).toString('base64');
            try {
                const client = yield this.createClient({ database, transactionId });
                try {
                    this.log(`[beginTransaction] transactionId: ${transactionId}`);
                    yield client.beginTransaction();
                    res.status(200).json({ transactionId });
                }
                catch (error) {
                    yield this.pool[transactionId].disconnect();
                    delete this.pool[transactionId];
                    throw error;
                }
            }
            catch (error) {
                next(error);
            }
        });
    }
    commitTransaction(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const { transactionId } = req.body;
            try {
                if (typeof transactionId !== 'string' || transactionId.trim() === '') {
                    throw createError(400, 'Transaction ID is empty');
                }
                const client = yield this.getClient({ transactionId });
                try {
                    this.log(`[commitTransaction] transactionId: ${transactionId}`);
                    yield client.commitTransaction();
                    res.status(200).json({ transactionStatus: 'Transaction Committed' });
                }
                finally {
                    yield this.pool[transactionId].disconnect();
                    delete this.pool[transactionId];
                }
            }
            catch (error) {
                next(error);
            }
        });
    }
    rollbackTransaction(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const { transactionId } = req.body;
            try {
                if (typeof transactionId !== 'string' || transactionId.trim() === '') {
                    throw createError(400, 'Transaction ID is empty');
                }
                const client = yield this.getClient({ transactionId });
                try {
                    this.log(`[rollbackTransaction] transactionId: ${transactionId}`);
                    yield client.rollbackTransaction();
                    res.status(200).json({ transactionStatus: 'Transaction Rolledback' });
                }
                finally {
                    yield this.pool[transactionId].disconnect();
                    delete this.pool[transactionId];
                }
            }
            catch (error) {
                next(error);
            }
        });
    }
    setRequestId(req, res, next) {
        const id = uuid();
        this.log(`[request] ${req.method} ${req.path} - requestId: ${id}`);
        res.setHeader('x-amzn-RequestId', id);
        next();
    }
    handleError(error, _req, res, next) {
        /* istanbul ignore next */
        if (res.headersSent) {
            return next(error);
        }
        const errorTypes = {
            400: 'BadRequestException:http://internal.amazon.com/coral/com.amazon.rdsdataservice/',
            403: 'ForbiddenException:http://internal.amazon.com/coral/com.amazon.rdsdataservice/',
            404: 'NotFoundException:http://internal.amazon.com/coral/com.amazon.rdsdataservice/',
            500: 'InternalServerErrorException:http://internal.amazon.com/coral/com.amazon.rdsdataservice/',
            503: 'ServiceUnavailableError:http://internal.amazon.com/coral/com.amazon.rdsdataservice/'
        };
        let statusCode = 500;
        if (error instanceof createError.HttpError) {
            statusCode = error.statusCode;
        }
        res.setHeader('x-amzn-ErrorType', errorTypes[statusCode]);
        res.status(statusCode).json({ message: error.message });
    }
    log(message) {
        if (typeof this.logger === 'function') {
            this.logger(message);
        }
    }
}
exports.Server = Server;
//# sourceMappingURL=Server.js.map