"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importStar(require("express"));
const db_1 = __importDefault(require("./config/db"));
const errorHandler_1 = __importDefault(require("./middleware/errorHandler"));
const auth_1 = __importDefault(require("./routes/auth"));
const claims_1 = __importDefault(require("./routes/claims"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const policies_1 = __importDefault(require("./routes/policies"));
const users_1 = __importDefault(require("./routes/users"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = Number(process.env.PORT) || 5000;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
app.use((0, cors_1.default)({
    origin: clientOrigin,
}));
app.use(express_1.default.json());
const apiRouter = (0, express_1.Router)();
apiRouter.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
apiRouter.use('/auth', auth_1.default);
apiRouter.use('/policies', policies_1.default);
apiRouter.use('/claims', claims_1.default);
apiRouter.use('/dashboard', dashboard_1.default);
apiRouter.use('/users', users_1.default);
app.use('/api', apiRouter);
app.use(errorHandler_1.default);
const startServer = async () => {
    await (0, db_1.default)();
    app.listen(port, () => {
        console.log(`capstone-api running on port ${port}`);
    });
};
startServer().catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
});
