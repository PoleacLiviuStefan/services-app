"use strict";
// File: app/api/user/bought-packages/route.ts
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
exports.GET = void 0;
var server_1 = require("next/server");
var next_1 = require("next-auth/next");
var auth_1 = require("@/lib/auth");
var prisma_1 = require("@/lib/prisma");
function GET() {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var session, userId, provider, boughtPackages, soldPackages;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, next_1.getServerSession(auth_1.authOptions)];
                case 1:
                    session = _b.sent();
                    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Nu ești autentificat." }, { status: 401 })];
                    }
                    userId = session.user.id;
                    return [4 /*yield*/, prisma_1.prisma.provider.findUnique({
                            where: { userId: userId },
                            select: { id: true }
                        })];
                case 2:
                    provider = _b.sent();
                    return [4 /*yield*/, prisma_1.prisma.userProviderPackage.findMany({
                            where: { userId: userId },
                            orderBy: { createdAt: "desc" },
                            select: {
                                id: true,
                                providerId: true,
                                packageId: true,
                                totalSessions: true,
                                usedSessions: true,
                                createdAt: true,
                                expiresAt: true,
                                providerPackage: {
                                    select: {
                                        service: true,
                                        totalSessions: true,
                                        price: true,
                                        createdAt: true,
                                        expiresAt: true
                                    }
                                },
                                provider: {
                                    select: {
                                        user: { select: { name: true } }
                                    }
                                },
                                invoices: {
                                    select: {
                                        id: true,
                                        number: true,
                                        url: true,
                                        createdAt: true
                                    },
                                    orderBy: { createdAt: "desc" }
                                }
                            }
                        })];
                case 3:
                    boughtPackages = _b.sent();
                    soldPackages = [];
                    if (!provider) return [3 /*break*/, 5];
                    return [4 /*yield*/, prisma_1.prisma.userProviderPackage.findMany({
                            where: { providerId: provider.id },
                            orderBy: { createdAt: "desc" },
                            select: {
                                id: true,
                                userId: true,
                                packageId: true,
                                totalSessions: true,
                                usedSessions: true,
                                createdAt: true,
                                expiresAt: true,
                                providerPackage: {
                                    select: {
                                        service: true,
                                        totalSessions: true,
                                        price: true,
                                        createdAt: true,
                                        expiresAt: true
                                    }
                                },
                                user: {
                                    select: { name: true }
                                },
                                invoices: {
                                    select: {
                                        id: true,
                                        number: true,
                                        url: true,
                                        createdAt: true
                                    },
                                    orderBy: { createdAt: "desc" }
                                }
                            }
                        })];
                case 4:
                    soldPackages = _b.sent();
                    _b.label = 5;
                case 5: 
                // 4. Returnăm ambele liste
                return [2 /*return*/, server_1.NextResponse.json({ boughtPackages: boughtPackages, soldPackages: soldPackages })];
            }
        });
    });
}
exports.GET = GET;
