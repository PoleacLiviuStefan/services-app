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
exports.GET = void 0;
// app/api/users/resolve/route.ts
var server_1 = require("next/server");
var client_1 = require("@prisma/client");
var next_auth_1 = require("next-auth");
var auth_1 = require("@/lib/auth");
var prisma = new client_1.PrismaClient();
// Funcția pentru formatarea URL-urilor (copiată din utils/util)
function formatForUrl(str) {
    return (str
        .toLowerCase()
        // Înlocuim fiecare grup de caractere care NU este:
        //   - litera a–z
        //   - cifră 0–9
        //   - una dintre literele românești: ăâîșț
        // cu o singură cratimă
        .replace(/[^a-z0-9ăâîșț]+/g, "-")
        // Dacă există mai multe cratime consecutive, reducem toate la una singură
        .replace(/-+/g, "-")
        // Eliminăm cratimele de la început și sfârșit (dacă au rămas)
        .replace(/^-+|-+$/g, ""));
}
// GET - Rezolvă un utilizator după identificator (nume formatat sau email)
function GET(req) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var session, searchParams, identifier_1, user, allUsers, searchName, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 8, , 9]);
                    return [4 /*yield*/, next_auth_1.getServerSession(auth_1.authOptions)];
                case 1:
                    session = _b.sent();
                    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.email)) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })];
                    }
                    searchParams = new URL(req.url).searchParams;
                    identifier_1 = searchParams.get('identifier');
                    if (!identifier_1) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Identifier is required' }, { status: 400 })];
                    }
                    user = null;
                    if (!identifier_1.includes('@')) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma.user.findUnique({
                            where: { email: identifier_1 },
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true
                            }
                        })];
                case 2:
                    user = _b.sent();
                    _b.label = 3;
                case 3:
                    if (!!user) return [3 /*break*/, 5];
                    return [4 /*yield*/, prisma.user.findMany({
                            where: {
                                name: {
                                    not: null
                                }
                            },
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true
                            }
                        })];
                case 4:
                    allUsers = _b.sent();
                    // Găsește utilizatorul cu numele formatat care match-uiește
                    user = allUsers.find(function (u) {
                        if (!u.name)
                            return false;
                        var formattedName = formatForUrl(u.name);
                        return formattedName === identifier_1.toLowerCase();
                    }) || null;
                    _b.label = 5;
                case 5:
                    if (!!user) return [3 /*break*/, 7];
                    searchName = identifier_1.replace(/-/g, ' ');
                    return [4 /*yield*/, prisma.user.findFirst({
                            where: {
                                name: {
                                    contains: searchName,
                                    mode: 'insensitive'
                                }
                            },
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true
                            }
                        })];
                case 6:
                    user = _b.sent();
                    _b.label = 7;
                case 7:
                    if (!user) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })];
                    }
                    // Verifică că utilizatorul nu încearcă să găsească pe sine
                    if (user.email === session.user.email) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Cannot start conversation with yourself' }, { status: 400 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            user: {
                                id: user.id,
                                name: user.name,
                                email: user.email,
                                image: user.image
                            }
                        })];
                case 8:
                    error_1 = _b.sent();
                    console.error('Error resolving user:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Failed to resolve user' }, { status: 500 })];
                case 9: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
