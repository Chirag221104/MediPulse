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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const auth_routes_1 = __importDefault(require("../src/routes/auth.routes"));
const error_1 = require("../src/middleware/error");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/v1/auth', auth_routes_1.default);
app.use(error_1.globalErrorHandler);
let mongoServer;
(0, globals_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    mongoServer = yield mongodb_memory_server_1.MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    yield mongoose_1.default.connect(uri);
}));
(0, globals_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_1.default.disconnect();
    yield mongoServer.stop();
}));
(0, globals_1.describe)('Auth Routes', () => {
    (0, globals_1.it)('should register a new user', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app).post('/api/v1/auth/register').send({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
        });
        (0, globals_1.expect)(res.status).toBe(201);
        (0, globals_1.expect)(res.body.success).toBe(true);
        (0, globals_1.expect)(res.body.data.user.email).toBe('test@example.com');
        (0, globals_1.expect)(res.body.data.accessToken).toBeDefined();
    }));
    (0, globals_1.it)('should login a user', () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, supertest_1.default)(app).post('/api/v1/auth/register').send({
            name: 'Login User',
            email: 'login@example.com',
            password: 'password123',
        });
        const res = yield (0, supertest_1.default)(app).post('/api/v1/auth/login').send({
            email: 'login@example.com',
            password: 'password123',
        });
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.success).toBe(true);
        (0, globals_1.expect)(res.body.data.accessToken).toBeDefined();
    }));
});
