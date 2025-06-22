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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.POST = void 0;
var server_1 = require("next/server");
var prisma_1 = require("@/lib/prisma");
var crypto_1 = require("crypto");
var mail_1 = require("@/lib/mail");
function POST(req) {
    return __awaiter(this, void 0, void 0, function () {
        var email, user, token, expiresAt;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, req.json()];
                case 1:
                    email = (_a.sent()).email;
                    if (typeof email !== 'string') {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Email invalid.' }, { status: 400 })];
                    }
                    return [4 /*yield*/, prisma_1.prisma.user.findFirst({
                            where: {
                                email: {
                                    equals: email,
                                    mode: 'insensitive'
                                }
                            }
                        })];
                case 2:
                    user = _a.sent();
                    if (!user) {
                        // nu expune existența
                        return [2 /*return*/, new server_1.NextResponse(JSON.stringify({ error: 'No user found' }), { status: 404 })];
                    }
                    return [4 /*yield*/, prisma_1.prisma.passwordReset.deleteMany({ where: { userId: user.id } })];
                case 3:
                    _a.sent();
                    token = crypto_1["default"].randomBytes(32).toString('hex');
                    expiresAt = new Date(Date.now() + 1000 * 60 * 60);
                    return [4 /*yield*/, prisma_1.prisma.passwordReset.create({
                            data: { userId: user.id, token: token, expiresAt: expiresAt }
                        })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, mail_1.sendPasswordResetEmail(email, token)];
                case 5:
                    _a.sent();
                    return [2 /*return*/, new server_1.NextResponse(null, { status: 204 })];
            }
        });
    });
}
exports.POST = POST;
