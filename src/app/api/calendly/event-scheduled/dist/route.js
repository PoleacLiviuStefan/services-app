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
exports.POST = exports.runtime = void 0;
// File: app/api/calendly/event-scheduled/route.ts
exports.runtime = "nodejs";
var server_1 = require("next/server");
var next_1 = require("next-auth/next");
var auth_1 = require("@/lib/auth");
var prisma_1 = require("@/lib/prisma");
function POST(req) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        // ————————————————————————————————
        // 4. Refresh token helper
        function refreshOnce() {
            return __awaiter(this, void 0, Promise, function () {
                var params, r, j;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!refreshToken_1)
                                return [2 /*return*/, false];
                            if (expiresAt_1 && new Date() < expiresAt_1)
                                return [2 /*return*/, false];
                            params = new URLSearchParams({
                                grant_type: "refresh_token",
                                client_id: process.env.NEXT_PUBLIC_CALENDLY_CLIENT_ID,
                                client_secret: process.env.CALENDLY_CLIENT_SECRET,
                                refresh_token: refreshToken_1
                            });
                            return [4 /*yield*/, fetch("https://auth.calendly.com/oauth/token", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                                    body: params.toString()
                                })];
                        case 1:
                            r = _a.sent();
                            if (!r.ok)
                                return [2 /*return*/, false];
                            return [4 /*yield*/, r.json()];
                        case 2:
                            j = _a.sent();
                            token_1 = j.access_token;
                            refreshToken_1 = j.refresh_token;
                            expiresAt_1 = new Date(Date.now() + j.expires_in * 1000);
                            return [4 /*yield*/, prisma_1.prisma.provider.update({
                                    where: { id: realProviderId_1 },
                                    data: {
                                        calendlyAccessToken: token_1,
                                        calendlyRefreshToken: refreshToken_1,
                                        calendlyExpiresAt: expiresAt_1
                                    }
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, true];
                    }
                });
            });
        }
        var session, currentUserId, body, _b, userId, scheduledEventUri, dbPr, realProviderId_1, token_1, refreshToken_1, expiresAt_1, mainSpecialityId, res, _c, scheduledJson, rsrc, scheduledAtStr, startStr, endStr, scheduledAt, startDate, endDate, duration, specialityId, pkgs, userPkg, totalPrice, zoomRes, zoomJson, sessionName, tokens, consultingSession, err_1;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 18, , 19]);
                    return [4 /*yield*/, next_1.getServerSession(auth_1.authOptions)];
                case 1:
                    session = _d.sent();
                    if (!session || !((_a = session.user) === null || _a === void 0 ? void 0 : _a.id)) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Unautorizat. Trebuie să fii autentificat." }, { status: 401 })];
                    }
                    currentUserId = session.user.id;
                    body = void 0;
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, req.json()];
                case 3:
                    body = _d.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _b = _d.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: "JSON invalid." }, { status: 400 })];
                case 5:
                    userId = body.providerId, scheduledEventUri = body.scheduledEventUri;
                    if (!userId || !scheduledEventUri) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Parametri lipsă: providerId sau scheduledEventUri." }, { status: 400 })];
                    }
                    return [4 /*yield*/, prisma_1.prisma.provider.findUnique({
                            where: { userId: userId },
                            select: {
                                id: true,
                                calendlyAccessToken: true,
                                calendlyRefreshToken: true,
                                calendlyExpiresAt: true,
                                mainSpecialityId: true
                            }
                        })];
                case 6:
                    dbPr = _d.sent();
                    if (!dbPr) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Provider invalid." }, { status: 404 })];
                    }
                    realProviderId_1 = dbPr.id, token_1 = dbPr.calendlyAccessToken, refreshToken_1 = dbPr.calendlyRefreshToken, expiresAt_1 = dbPr.calendlyExpiresAt, mainSpecialityId = dbPr.mainSpecialityId;
                    return [4 /*yield*/, fetch(scheduledEventUri, {
                            headers: { Authorization: "Bearer " + token_1 }
                        })];
                case 7:
                    res = _d.sent();
                    _c = res.status === 401;
                    if (!_c) return [3 /*break*/, 9];
                    return [4 /*yield*/, refreshOnce()];
                case 8:
                    _c = (_d.sent());
                    _d.label = 9;
                case 9:
                    if (!_c) return [3 /*break*/, 11];
                    return [4 /*yield*/, fetch(scheduledEventUri, {
                            headers: { Authorization: "Bearer " + token_1 }
                        })];
                case 10:
                    res = _d.sent();
                    _d.label = 11;
                case 11: return [4 /*yield*/, res.json()];
                case 12:
                    scheduledJson = _d.sent();
                    if (!res.ok) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Eroare Calendly", details: scheduledJson }, { status: res.status })];
                    }
                    rsrc = scheduledJson.resource;
                    scheduledAtStr = rsrc.created_at;
                    startStr = rsrc.start_time;
                    endStr = rsrc.end_time;
                    if (!scheduledAtStr || !startStr || !endStr) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Payload incomplet de la Calendly." }, { status: 500 })];
                    }
                    scheduledAt = new Date(scheduledAtStr);
                    startDate = new Date(startStr);
                    endDate = new Date(endStr);
                    duration = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
                    specialityId = mainSpecialityId;
                    if (!specialityId) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Nu există specialityId pentru provider." }, { status: 400 })];
                    }
                    return [4 /*yield*/, prisma_1.prisma.userProviderPackage.findMany({
                            where: {
                                userId: currentUserId,
                                providerId: realProviderId_1
                            },
                            include: {
                                providerPackage: { select: { price: true, totalSessions: true } }
                            },
                            orderBy: { createdAt: "asc" }
                        })];
                case 13:
                    pkgs = _d.sent();
                    userPkg = pkgs.find(function (p) { return p.usedSessions < p.providerPackage.totalSessions; });
                    if (!userPkg) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Nu ai sesiuni disponibile în niciun pachet." }, { status: 400 })];
                    }
                    totalPrice = userPkg.providerPackage.price / userPkg.providerPackage.totalSessions;
                    return [4 /*yield*/, fetch(process.env.NEXT_PUBLIC_BASE_URL + "/api/video/create-session", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                users: [realProviderId_1, currentUserId],
                                providerId: realProviderId_1,
                                clientId: currentUserId,
                                specialityId: specialityId,
                                packageId: userPkg.id
                            })
                        })];
                case 14:
                    zoomRes = _d.sent();
                    return [4 /*yield*/, zoomRes.json()];
                case 15:
                    zoomJson = _d.sent();
                    if (!zoomRes.ok) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Zoom create-session failed", details: zoomJson }, { status: zoomRes.status })];
                    }
                    sessionName = zoomJson.sessionName, tokens = zoomJson.tokens;
                    return [4 /*yield*/, prisma_1.prisma.consultingSession.upsert({
                            where: { zoomSessionName: sessionName },
                            update: {
                                scheduledAt: scheduledAt,
                                startDate: startDate,
                                endDate: endDate,
                                duration: duration,
                                totalPrice: Math.round(totalPrice * 100) / 100,
                                calendlyEventUri: scheduledEventUri
                            },
                            create: {
                                providerId: realProviderId_1,
                                clientId: currentUserId,
                                specialityId: specialityId,
                                packageId: userPkg.id,
                                duration: duration,
                                scheduledAt: scheduledAt,
                                startDate: startDate,
                                endDate: endDate,
                                totalPrice: Math.round(totalPrice * 100) / 100,
                                calendlyEventUri: scheduledEventUri,
                                zoomSessionName: sessionName,
                                zoomTokens: tokens,
                                isFinished: false
                            }
                        })];
                case 16:
                    consultingSession = _d.sent();
                    // ————————————————————————————————
                    // 12. Increment usedSessions
                    return [4 /*yield*/, prisma_1.prisma.userProviderPackage.update({
                            where: { id: userPkg.id },
                            data: { usedSessions: { increment: 1 } }
                        })];
                case 17:
                    // ————————————————————————————————
                    // 12. Increment usedSessions
                    _d.sent();
                    // ————————————————————————————————
                    // 13. Răspuns final
                    return [2 /*return*/, server_1.NextResponse.json({ ok: true, data: consultingSession }, { status: 201 })];
                case 18:
                    err_1 = _d.sent();
                    console.error("Unexpected error în /api/calendly/event-scheduled:", err_1);
                    return [2 /*return*/, server_1.NextResponse.json({
                            error: "Eroare internă neașteptată",
                            details: (err_1 === null || err_1 === void 0 ? void 0 : err_1.message) || String(err_1)
                        }, { status: 500 })];
                case 19: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
