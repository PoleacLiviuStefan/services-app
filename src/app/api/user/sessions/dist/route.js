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
// /api/user/sessions/route.ts
var server_1 = require("next/server");
var next_auth_1 = require("next-auth");
var auth_1 = require("@/lib/auth");
var prisma_1 = require("@/lib/prisma");
function GET() {
    var _a;
    return __awaiter(this, void 0, Promise, function () {
        var session, userId, provider, isProvider_1, whereCondition, consultingSessions, _i, consultingSessions_1, sess, recordingUrl, error_1, sessions, stats, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 12, , 13]);
                    return [4 /*yield*/, next_auth_1.getServerSession(auth_1.authOptions)];
                case 1:
                    session = _b.sent();
                    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Neautentificat" }, { status: 401 })];
                    }
                    userId = session.user.id;
                    console.log("\uD83D\uDCCB Ob\u021Binere sesiuni pentru user: " + userId);
                    return [4 /*yield*/, prisma_1.prisma.provider.findUnique({
                            where: { userId: userId },
                            select: { id: true }
                        })];
                case 2:
                    provider = _b.sent();
                    isProvider_1 = !!provider;
                    console.log("\uD83D\uDC64 User " + userId + " este " + (isProvider_1 ? 'provider' : 'client'));
                    whereCondition = isProvider_1
                        ? { providerId: provider.id }
                        : { clientId: userId };
                    return [4 /*yield*/, prisma_1.prisma.consultingSession.findMany({
                            where: whereCondition,
                            include: {
                                provider: {
                                    include: {
                                        user: {
                                            select: { id: true, name: true, email: true, image: true }
                                        }
                                    }
                                },
                                client: {
                                    select: { id: true, name: true, email: true, image: true }
                                },
                                speciality: {
                                    select: { id: true, name: true, description: true, price: true }
                                },
                                userPackage: {
                                    select: {
                                        id: true,
                                        totalSessions: true,
                                        usedSessions: true,
                                        expiresAt: true
                                    }
                                }
                            },
                            orderBy: { startDate: 'desc' }
                        })];
                case 3:
                    consultingSessions = _b.sent();
                    console.log("\uD83D\uDCCA G\u0103site " + consultingSessions.length + " sesiuni pentru user " + userId);
                    _i = 0, consultingSessions_1 = consultingSessions;
                    _b.label = 4;
                case 4:
                    if (!(_i < consultingSessions_1.length)) return [3 /*break*/, 11];
                    sess = consultingSessions_1[_i];
                    if (!(sess.status === 'COMPLETED' && !sess.recordingUrl && sess.dailyRoomName)) return [3 /*break*/, 10];
                    console.log("\uD83D\uDD0D Verificare \u00EEnregistrare pentru sesiunea " + sess.id + " (" + sess.dailyRoomName + ")");
                    _b.label = 5;
                case 5:
                    _b.trys.push([5, 9, , 10]);
                    return [4 /*yield*/, fetchRecordingFromDaily(sess.dailyRoomName)];
                case 6:
                    recordingUrl = _b.sent();
                    if (!recordingUrl) return [3 /*break*/, 8];
                    // Actualizează sesiunea cu URL-ul găsit
                    return [4 /*yield*/, prisma_1.prisma.consultingSession.update({
                            where: { id: sess.id },
                            data: {
                                recordingUrl: recordingUrl,
                                hasRecording: true,
                                recordingStatus: 'READY',
                                updatedAt: new Date()
                            }
                        })];
                case 7:
                    // Actualizează sesiunea cu URL-ul găsit
                    _b.sent();
                    // Actualizează obiectul local pentru response
                    sess.recordingUrl = recordingUrl;
                    sess.hasRecording = true;
                    sess.recordingStatus = 'READY';
                    console.log("\u2705 URL \u00EEnregistrare g\u0103sit \u0219i salvat pentru " + sess.id + ": " + recordingUrl);
                    _b.label = 8;
                case 8: return [3 /*break*/, 10];
                case 9:
                    error_1 = _b.sent();
                    console.error("\u274C Eroare la ob\u021Binerea \u00EEnregistr\u0103rii pentru " + sess.id + ":", error_1);
                    return [3 /*break*/, 10];
                case 10:
                    _i++;
                    return [3 /*break*/, 4];
                case 11:
                    sessions = consultingSessions.map(function (sess) {
                        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
                        var counterpart = isProvider_1
                            ? ((_a = sess.client) === null || _a === void 0 ? void 0 : _a.name) || ((_b = sess.client) === null || _b === void 0 ? void 0 : _b.email) || 'Client necunoscut'
                            : sess.provider.user.name || sess.provider.user.email || 'Provider necunoscut';
                        var counterpartEmail = isProvider_1
                            ? ((_c = sess.client) === null || _c === void 0 ? void 0 : _c.email) || null
                            : sess.provider.user.email || null;
                        var counterpartImage = isProvider_1
                            ? ((_d = sess.client) === null || _d === void 0 ? void 0 : _d.image) || null
                            : sess.provider.user.image || null;
                        // Determină dacă sesiunea are înregistrare disponibilă
                        var hasRecording = !!(sess.hasRecording || sess.recordingUrl);
                        // Determină statusul real al sesiunii
                        var now = new Date();
                        var actualStatus = sess.status;
                        // Dacă sesiunea e programată dar a trecut timpul, poate fi considerată "missed" 
                        if (sess.status === 'SCHEDULED' && sess.startDate && new Date(sess.startDate) < now) {
                            // Verifică dacă cineva s-a alăturat
                            if (!sess.joinedAt) {
                                actualStatus = 'NO_SHOW';
                            }
                        }
                        return {
                            id: sess.id,
                            startDate: ((_e = sess.startDate) === null || _e === void 0 ? void 0 : _e.toISOString()) || null,
                            endDate: ((_f = sess.endDate) === null || _f === void 0 ? void 0 : _f.toISOString()) || null,
                            joinUrl: sess.dailyRoomUrl || '',
                            roomName: sess.dailyRoomName,
                            roomId: sess.dailyRoomId,
                            counterpart: counterpart,
                            counterpartEmail: counterpartEmail,
                            counterpartImage: counterpartImage,
                            speciality: ((_g = sess.speciality) === null || _g === void 0 ? void 0 : _g.name) || 'Serviciu necunoscut',
                            specialityId: ((_h = sess.speciality) === null || _h === void 0 ? void 0 : _h.id) || null,
                            status: actualStatus,
                            duration: sess.duration,
                            actualDuration: sess.actualDuration,
                            isFinished: sess.isFinished,
                            participantCount: sess.participantCount,
                            rating: sess.rating,
                            feedback: sess.feedback,
                            notes: sess.notes,
                            totalPrice: sess.totalPrice,
                            role: isProvider_1 ? 'provider' : 'client',
                            createdAt: ((_j = sess.createdAt) === null || _j === void 0 ? void 0 : _j.toISOString()) || new Date().toISOString(),
                            updatedAt: ((_k = sess.updatedAt) === null || _k === void 0 ? void 0 : _k.toISOString()) || new Date().toISOString(),
                            // Session timing
                            scheduledAt: ((_l = sess.scheduledAt) === null || _l === void 0 ? void 0 : _l.toISOString()) || null,
                            joinedAt: ((_m = sess.joinedAt) === null || _m === void 0 ? void 0 : _m.toISOString()) || null,
                            leftAt: ((_o = sess.leftAt) === null || _o === void 0 ? void 0 : _o.toISOString()) || null,
                            // Recording information - ACTUALIZAT
                            recordingUrl: sess.recordingUrl,
                            hasRecording: hasRecording,
                            recordingStarted: sess.recordingStarted || false,
                            recordingStartedAt: ((_p = sess.recordingStartedAt) === null || _p === void 0 ? void 0 : _p.toISOString()) || null,
                            recordingStoppedAt: ((_q = sess.recordingStoppedAt) === null || _q === void 0 ? void 0 : _q.toISOString()) || null,
                            recordingDuration: sess.recordingDuration || null,
                            recordingStatus: sess.recordingStatus || 'NONE',
                            // Daily.co integration
                            dailyRoomName: sess.dailyRoomName,
                            dailyDomainName: sess.dailyDomainName,
                            dailyCreatedAt: ((_r = sess.dailyCreatedAt) === null || _r === void 0 ? void 0 : _r.toISOString()) || null,
                            // Package information
                            packageInfo: sess.userPackage ? {
                                id: sess.userPackage.id,
                                totalSessions: sess.userPackage.totalSessions,
                                usedSessions: sess.userPackage.usedSessions,
                                remainingSessions: sess.userPackage.totalSessions - sess.userPackage.usedSessions,
                                expiresAt: ((_s = sess.userPackage.expiresAt) === null || _s === void 0 ? void 0 : _s.toISOString()) || null
                            } : null,
                            // Calendly integration (dacă există)
                            calendlyEventUri: sess.calendlyEventUri
                        };
                    });
                    stats = {
                        total: sessions.length,
                        scheduled: sessions.filter(function (s) { return s.status === 'SCHEDULED'; }).length,
                        inProgress: sessions.filter(function (s) { return s.status === 'IN_PROGRESS'; }).length,
                        completed: sessions.filter(function (s) { return s.status === 'COMPLETED'; }).length,
                        cancelled: sessions.filter(function (s) { return s.status === 'CANCELLED'; }).length,
                        noShow: sessions.filter(function (s) { return s.status === 'NO_SHOW'; }).length,
                        withRecording: sessions.filter(function (s) { return s.hasRecording; }).length
                    };
                    console.log("\uD83D\uDCC8 Statistici sesiuni pentru user " + userId + ":", stats);
                    return [2 /*return*/, server_1.NextResponse.json({
                            sessions: sessions,
                            totalCount: sessions.length,
                            isProvider: isProvider_1,
                            stats: stats,
                            providerId: (provider === null || provider === void 0 ? void 0 : provider.id) || null
                        })];
                case 12:
                    error_2 = _b.sent();
                    console.error("❌ Error fetching user sessions:", error_2);
                    return [2 /*return*/, server_1.NextResponse.json({ error: "Eroare internă la obținerea sesiunilor" }, { status: 500 })];
                case 13: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
// Funcție helper pentru a obține înregistrarea de la Daily.co
function fetchRecordingFromDaily(roomName) {
    return __awaiter(this, void 0, Promise, function () {
        var dailyApiKey, response, data, recordings, recording, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!roomName)
                        return [2 /*return*/, null];
                    dailyApiKey = process.env.DAILY_API_KEY;
                    if (!dailyApiKey) {
                        console.warn('⚠️ DAILY_API_KEY not configured, cannot fetch recordings');
                        return [2 /*return*/, null];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch("https://api.daily.co/v1/recordings", {
                            headers: {
                                'Authorization': "Bearer " + dailyApiKey,
                                'Content-Type': 'application/json'
                            }
                        })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) {
                        console.warn("\u26A0\uFE0F Failed to fetch recordings from Daily.co: " + response.statusText);
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    recordings = data.data || [];
                    recording = recordings.find(function (r) { return r.room_name === roomName; });
                    if (recording && recording.download_link && recording.status === 'finished') {
                        return [2 /*return*/, recording.download_link];
                    }
                    return [2 /*return*/, null];
                case 4:
                    error_3 = _a.sent();
                    console.error('❌ Error fetching recording from Daily.co:', error_3);
                    return [2 /*return*/, null];
                case 5: return [2 /*return*/];
            }
        });
    });
}
