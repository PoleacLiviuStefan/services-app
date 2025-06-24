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
exports.GET = exports.runtime = void 0;
exports.runtime = "nodejs";
var server_1 = require("next/server");
var prisma_1 = require("@/lib/prisma");
function GET(req) {
    return __awaiter(this, void 0, void 0, function () {
        // 3) Helper de refresh (va fi chemat doar pe 401)
        function doRefresh() {
            return __awaiter(this, void 0, Promise, function () {
                var params, r, j;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            console.log('[Debug] Attempting token refresh');
                            if (!refreshToken_1)
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
                            console.log('[Debug] Refresh response status:', r.status);
                            if (!r.ok)
                                return [2 /*return*/, false];
                            return [4 /*yield*/, r.json()];
                        case 2:
                            j = _a.sent();
                            console.log('[Debug] Refresh response json:', j);
                            token_1 = j.access_token;
                            refreshToken_1 = j.refresh_token;
                            // Salvăm în DB tokenurile noi
                            return [4 /*yield*/, prisma_1.prisma.provider.update({
                                    where: { userId: providerId_1 },
                                    data: {
                                        calendlyAccessToken: token_1,
                                        calendlyRefreshToken: refreshToken_1,
                                        calendlyExpiresAt: new Date(Date.now() + j.expires_in * 1000)
                                    }
                                })];
                        case 3:
                            // Salvăm în DB tokenurile noi
                            _a.sent();
                            return [2 /*return*/, true];
                    }
                });
            });
        }
        var searchParams, providerId_1, dbPr, token_1, refreshToken_1, userUri_1, fetchEventTypes, evtRes, refreshed, evtJson, firstActive, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 7, , 8]);
                    searchParams = new URL(req.url).searchParams;
                    providerId_1 = searchParams.get("providerId");
                    console.log('[Debug] providerId param:', providerId_1);
                    if (!providerId_1) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Lipsește parametrul providerId în query." }, { status: 400 })];
                    }
                    return [4 /*yield*/, prisma_1.prisma.provider.findUnique({
                            where: { userId: providerId_1 },
                            select: {
                                calendlyAccessToken: true,
                                calendlyRefreshToken: true,
                                calendlyUserUri: true
                            }
                        })];
                case 1:
                    dbPr = _a.sent();
                    console.log('[Debug] dbPr record:', dbPr);
                    if (!dbPr ||
                        !dbPr.calendlyAccessToken ||
                        !dbPr.calendlyRefreshToken ||
                        !dbPr.calendlyUserUri) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Provider invalid sau neconectat la Calendly." }, { status: 404 })];
                    }
                    token_1 = dbPr.calendlyAccessToken, refreshToken_1 = dbPr.calendlyRefreshToken, userUri_1 = dbPr.calendlyUserUri;
                    fetchEventTypes = function () {
                        return fetch("https://api.calendly.com/event_types?user=" + encodeURIComponent(userUri_1), {
                            headers: {
                                Authorization: "Bearer " + token_1,
                                "Content-Type": "application/json"
                            }
                        });
                    };
                    console.log('[Debug] Fetching event_types with token');
                    return [4 /*yield*/, fetchEventTypes()];
                case 2:
                    evtRes = _a.sent();
                    console.log('[Debug] Initial event_types status:', evtRes.status);
                    if (!(evtRes.status === 401)) return [3 /*break*/, 5];
                    return [4 /*yield*/, doRefresh()];
                case 3:
                    refreshed = _a.sent();
                    console.log('[Debug] Token refreshed:', refreshed);
                    if (!refreshed) return [3 /*break*/, 5];
                    return [4 /*yield*/, fetchEventTypes()];
                case 4:
                    evtRes = _a.sent();
                    console.log('[Debug] Retry event_types status:', evtRes.status);
                    _a.label = 5;
                case 5: return [4 /*yield*/, evtRes.json()];
                case 6:
                    evtJson = _a.sent();
                    console.log('[Debug] event_types response json:', evtJson);
                    if (!evtRes.ok ||
                        !Array.isArray(evtJson.collection) ||
                        evtJson.collection.length === 0) {
                        console.error("Calendly fetch event_types error:", evtRes.status, evtJson);
                        return [2 /*return*/, server_1.NextResponse.json({
                                error: evtRes.status === 401
                                    ? "Token invalid la Calendly, reconectează-te."
                                    : "Nu s-au găsit event_types active.",
                                details: evtJson
                            }, { status: evtRes.status === 401 ? 401 : 404 })];
                    }
                    firstActive = evtJson.collection.find(function (et) { return et.active; }) ||
                        evtJson.collection[0];
                    console.log('[Debug] firstActive:', firstActive);
                    if (!firstActive.scheduling_url) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Nu am găsit scheduling_url valid." }, { status: 404 })];
                    }
                    // 6) Returnăm scheduling_url
                    return [2 /*return*/, server_1.NextResponse.json({ scheduling_url: firstActive.scheduling_url }, { status: 200 })];
                case 7:
                    err_1 = _a.sent();
                    console.error("Unexpected error în /api/calendly/user:", (err_1 === null || err_1 === void 0 ? void 0 : err_1.message) || err_1);
                    return [2 /*return*/, server_1.NextResponse.json({
                            error: "Eroare internă neașteptată.",
                            details: (err_1 === null || err_1 === void 0 ? void 0 : err_1.message) || String(err_1)
                        }, { status: 500 })];
                case 8: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
