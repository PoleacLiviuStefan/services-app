"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.GET = void 0;
// /api/user/sessions/route.ts - API CU LEGĂTURĂ DIRECTĂ RECENZII
var server_1 = require("next/server");
var next_auth_1 = require("next-auth");
var auth_1 = require("@/lib/auth");
var prisma_1 = require("@/lib/prisma");
// Funcție pentru calcularea statisticilor de recenzii pentru provider
function getProviderReviewStats(providerId) {
    return __awaiter(this, void 0, void 0, function () {
        var reviewStats, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, prisma_1.prisma.review.aggregate({
                            where: {
                                providerId: providerId
                            },
                            _count: {
                                id: true
                            },
                            _avg: {
                                rating: true
                            }
                        })];
                case 1:
                    reviewStats = _a.sent();
                    return [2 /*return*/, {
                            totalReviews: reviewStats._count.id || 0,
                            averageRating: reviewStats._avg.rating || 0
                        }];
                case 2:
                    error_1 = _a.sent();
                    console.error('❌ Eroare la calcularea statisticilor de recenzii:', error_1);
                    return [2 /*return*/, {
                            totalReviews: 0,
                            averageRating: 0
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function GET() {
    var _a, _b;
    return __awaiter(this, void 0, Promise, function () {
        var session, userId_1, provider, isProvider, providerSessions, _i, providerSessions_1, session_1, review, reviewError_1, error_2, clientSessions, clientRecord, _c, clientSessions_1, session_2, review, reviewError_2, error_3, _d, clientSessions_2, session_3, review, reviewError_3, error_4, allSessions, sessionsToUpdate, _e, allSessions_1, sess, statusCheck, updateGroups, updatePromises, error_5, _f, allSessions_2, sess, isSessionCompleted, hasRoomName, missingRecording, recordingData, error_6, mapSessionToResponse_1, mappedProviderSessions, mappedClientSessions, providerReviewStats_1, statsError_1, calculateStats, stats, nowUTC, isProduction, ROMANIA_OFFSET, nowAdjusted, error_7;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    console.log("\u23F0 Server time: " + new Date().toISOString());
                    _g.label = 1;
                case 1:
                    _g.trys.push([1, 53, , 54]);
                    return [4 /*yield*/, next_auth_1.getServerSession(auth_1.authOptions)];
                case 2:
                    session = _g.sent();
                    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Neautentificat" }, { status: 401 })];
                    }
                    userId_1 = session.user.id;
                    console.log("\uD83D\uDCCB Ob\u021Binere sesiuni DUAL pentru user: " + userId_1);
                    return [4 /*yield*/, prisma_1.prisma.provider.findUnique({
                            where: { userId: userId_1 },
                            select: { id: true }
                        })];
                case 3:
                    provider = _g.sent();
                    isProvider = !!provider;
                    console.log("\uD83D\uDC64 User " + userId_1 + " este " + (isProvider ? 'provider' : 'doar client'));
                    providerSessions = [];
                    if (!isProvider) return [3 /*break*/, 13];
                    console.log("\uD83D\uDD0D C\u0103utare sesiuni ca PROVIDER pentru providerId: " + provider.id);
                    _g.label = 4;
                case 4:
                    _g.trys.push([4, 12, , 13]);
                    return [4 /*yield*/, prisma_1.prisma.consultingSession.findMany({
                            where: { providerId: provider.id },
                            include: {
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
                                },
                                review: {
                                    include: {
                                        fromUser: {
                                            select: { id: true, name: true, email: true, image: true }
                                        }
                                    }
                                }
                            },
                            orderBy: { startDate: 'desc' }
                        })];
                case 5:
                    // 🔧 QUERY DEFENSIV CU TRY-CATCH PENTRU REVIEW INCLUDE
                    providerSessions = _g.sent();
                    console.log("\u2705 G\u0103site " + providerSessions.length + " sesiuni ca PROVIDER");
                    if (!(providerSessions.length > 0)) return [3 /*break*/, 11];
                    console.log("\uD83D\uDD0D \u00CEnc\u0103rcare recenzii separate pentru " + providerSessions.length + " sesiuni provider...");
                    _i = 0, providerSessions_1 = providerSessions;
                    _g.label = 6;
                case 6:
                    if (!(_i < providerSessions_1.length)) return [3 /*break*/, 11];
                    session_1 = providerSessions_1[_i];
                    _g.label = 7;
                case 7:
                    _g.trys.push([7, 9, , 10]);
                    return [4 /*yield*/, prisma_1.prisma.review.findUnique({
                            where: { sessionId: session_1.id },
                            include: {
                                fromUser: {
                                    select: { name: true, email: true, image: true }
                                }
                            }
                        })];
                case 8:
                    review = _g.sent();
                    session_1.review = review;
                    if (review) {
                        console.log("\uD83D\uDCDD G\u0103sit\u0103 recenzie pentru sesiunea " + session_1.id + ": " + review.rating + "/5");
                    }
                    return [3 /*break*/, 10];
                case 9:
                    reviewError_1 = _g.sent();
                    console.error("\u274C Eroare la \u00EEnc\u0103rcarea recenziei pentru sesiunea " + session_1.id + ":", reviewError_1);
                    session_1.review = null;
                    return [3 /*break*/, 10];
                case 10:
                    _i++;
                    return [3 /*break*/, 6];
                case 11: return [3 /*break*/, 13];
                case 12:
                    error_2 = _g.sent();
                    console.error("\u274C Eroare la c\u0103utarea sesiunilor ca provider:", error_2);
                    providerSessions = [];
                    return [3 /*break*/, 13];
                case 13:
                    clientSessions = [];
                    // Încearcă strategii multiple pentru a găsi sesiunile ca client
                    console.log("\uD83D\uDD0D C\u0103utare sesiuni ca CLIENT pentru userId: " + userId_1);
                    _g.label = 14;
                case 14:
                    _g.trys.push([14, 25, , 26]);
                    return [4 /*yield*/, ((_b = prisma_1.prisma.client) === null || _b === void 0 ? void 0 : _b.findUnique({
                            where: { userId: userId_1 },
                            select: { id: true }
                        }))];
                case 15:
                    clientRecord = _g.sent();
                    if (!clientRecord) return [3 /*break*/, 23];
                    console.log("\u2705 Strategia 1 - folosesc clientId din model client: " + clientRecord.id);
                    return [4 /*yield*/, prisma_1.prisma.consultingSession.findMany({
                            where: { clientId: clientRecord.id },
                            include: {
                                provider: {
                                    include: {
                                        user: {
                                            select: { id: true, name: true, email: true, image: true }
                                        }
                                    }
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
                                },
                                review: {
                                    include: {
                                        fromUser: {
                                            select: { id: true, name: true, email: true, image: true }
                                        }
                                    }
                                }
                            },
                            orderBy: { startDate: 'desc' }
                        })];
                case 16:
                    clientSessions = _g.sent();
                    console.log("\u2705 G\u0103site " + clientSessions.length + " sesiuni ca CLIENT (strategia 1)");
                    if (!(clientSessions.length > 0)) return [3 /*break*/, 22];
                    console.log("\uD83D\uDD0D \u00CEnc\u0103rcare recenzii separate pentru " + clientSessions.length + " sesiuni client...");
                    _c = 0, clientSessions_1 = clientSessions;
                    _g.label = 17;
                case 17:
                    if (!(_c < clientSessions_1.length)) return [3 /*break*/, 22];
                    session_2 = clientSessions_1[_c];
                    _g.label = 18;
                case 18:
                    _g.trys.push([18, 20, , 21]);
                    return [4 /*yield*/, prisma_1.prisma.review.findUnique({
                            where: { sessionId: session_2.id }
                        })];
                case 19:
                    review = _g.sent();
                    session_2.review = review;
                    if (review) {
                        console.log("\uD83D\uDCDD G\u0103sit\u0103 recenzie pentru sesiunea " + session_2.id + ": " + review.rating + "/5");
                    }
                    return [3 /*break*/, 21];
                case 20:
                    reviewError_2 = _g.sent();
                    console.error("\u274C Eroare la \u00EEnc\u0103rcarea recenziei pentru sesiunea " + session_2.id + ":", reviewError_2);
                    session_2.review = null;
                    return [3 /*break*/, 21];
                case 21:
                    _c++;
                    return [3 /*break*/, 17];
                case 22: return [3 /*break*/, 24];
                case 23:
                    console.log("\u26A0\uFE0F Strategia 1 - nu s-a g\u0103sit client record pentru userId: " + userId_1);
                    _g.label = 24;
                case 24: return [3 /*break*/, 26];
                case 25:
                    error_3 = _g.sent();
                    console.log("\u274C Strategia 1 failed (model client nu exist\u0103):", error_3.message);
                    return [3 /*break*/, 26];
                case 26:
                    if (!(clientSessions.length === 0)) return [3 /*break*/, 36];
                    console.log("\uD83D\uDD04 \u00CEncerc strategia 2 - clientId = userId direct");
                    _g.label = 27;
                case 27:
                    _g.trys.push([27, 35, , 36]);
                    return [4 /*yield*/, prisma_1.prisma.consultingSession.findMany({
                            where: { clientId: userId_1 },
                            include: {
                                provider: {
                                    include: {
                                        user: {
                                            select: { id: true, name: true, email: true, image: true }
                                        }
                                    }
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
                                },
                                review: {
                                    include: {
                                        fromUser: {
                                            select: { id: true, name: true, email: true, image: true }
                                        }
                                    }
                                }
                            },
                            orderBy: { startDate: 'desc' }
                        })];
                case 28:
                    clientSessions = _g.sent();
                    console.log("\u2705 G\u0103site " + clientSessions.length + " sesiuni ca CLIENT (strategia 2)");
                    if (!(clientSessions.length > 0)) return [3 /*break*/, 34];
                    console.log("\uD83D\uDD0D \u00CEnc\u0103rcare recenzii separate pentru " + clientSessions.length + " sesiuni client (strategia 2)...");
                    _d = 0, clientSessions_2 = clientSessions;
                    _g.label = 29;
                case 29:
                    if (!(_d < clientSessions_2.length)) return [3 /*break*/, 34];
                    session_3 = clientSessions_2[_d];
                    _g.label = 30;
                case 30:
                    _g.trys.push([30, 32, , 33]);
                    return [4 /*yield*/, prisma_1.prisma.review.findUnique({
                            where: { sessionId: session_3.id }
                        })];
                case 31:
                    review = _g.sent();
                    session_3.review = review;
                    if (review) {
                        console.log("\uD83D\uDCDD G\u0103sit\u0103 recenzie pentru sesiunea " + session_3.id + ": " + review.rating + "/5");
                    }
                    return [3 /*break*/, 33];
                case 32:
                    reviewError_3 = _g.sent();
                    console.error("\u274C Eroare la \u00EEnc\u0103rcarea recenziei pentru sesiunea " + session_3.id + ":", reviewError_3);
                    session_3.review = null;
                    return [3 /*break*/, 33];
                case 33:
                    _d++;
                    return [3 /*break*/, 29];
                case 34: return [3 /*break*/, 36];
                case 35:
                    error_4 = _g.sent();
                    console.error("\u274C Strategia 2 failed:", error_4);
                    clientSessions = [];
                    return [3 /*break*/, 36];
                case 36:
                    allSessions = __spreadArrays(providerSessions, clientSessions);
                    sessionsToUpdate = [];
                    for (_e = 0, allSessions_1 = allSessions; _e < allSessions_1.length; _e++) {
                        sess = allSessions_1[_e];
                        statusCheck = checkAndUpdateSessionStatus(sess);
                        if (statusCheck.needsUpdate) {
                            console.log("\uD83D\uDD04 Sesiunea " + sess.id + " necesit\u0103 actualizare:", {
                                oldStatus: sess.status,
                                newStatus: statusCheck.newStatus,
                                oldIsFinished: sess.isFinished,
                                newIsFinished: statusCheck.newIsFinished,
                                reason: statusCheck.reason
                            });
                            sessionsToUpdate.push({
                                id: sess.id,
                                status: statusCheck.newStatus,
                                isFinished: statusCheck.newIsFinished,
                                reason: statusCheck.reason
                            });
                            // Actualizează obiectul local pentru răspuns
                            sess.status = statusCheck.newStatus;
                            sess.isFinished = statusCheck.newIsFinished;
                        }
                    }
                    if (!(sessionsToUpdate.length > 0)) return [3 /*break*/, 40];
                    console.log("\uD83D\uDD04 Actualizez " + sessionsToUpdate.length + " sesiuni \u00EEn baza de date");
                    _g.label = 37;
                case 37:
                    _g.trys.push([37, 39, , 40]);
                    updateGroups = sessionsToUpdate.reduce(function (groups, session) {
                        var key = session.status + "-" + session.isFinished;
                        if (!groups[key])
                            groups[key] = [];
                        groups[key].push(session.id);
                        return groups;
                    }, {});
                    updatePromises = Object.entries(updateGroups).map(function (_a) {
                        var key = _a[0], sessionIds = _a[1];
                        var _b = key.split('-'), status = _b[0], isFinished = _b[1];
                        return prisma_1.prisma.consultingSession.updateMany({
                            where: { id: { "in": sessionIds } },
                            data: {
                                status: status,
                                isFinished: isFinished === 'true',
                                updatedAt: new Date()
                            }
                        });
                    });
                    return [4 /*yield*/, Promise.all(updatePromises)];
                case 38:
                    _g.sent();
                    console.log("\u2705 Sesiuni actualizate cu succes:", {
                        total: sessionsToUpdate.length,
                        byStatus: sessionsToUpdate.reduce(function (acc, s) {
                            acc[s.status] = (acc[s.status] || 0) + 1;
                            return acc;
                        }, {})
                    });
                    return [3 /*break*/, 40];
                case 39:
                    error_5 = _g.sent();
                    console.error("\u274C Eroare la actualizarea sesiunilor:", error_5);
                    return [3 /*break*/, 40];
                case 40:
                    _f = 0, allSessions_2 = allSessions;
                    _g.label = 41;
                case 41:
                    if (!(_f < allSessions_2.length)) return [3 /*break*/, 48];
                    sess = allSessions_2[_f];
                    isSessionCompleted = sess.status === 'COMPLETED' || sess.isFinished;
                    hasRoomName = sess.dailyRoomName;
                    missingRecording = !sess.recordingUrl;
                    if (!(isSessionCompleted && hasRoomName && missingRecording)) return [3 /*break*/, 47];
                    console.log("\uD83D\uDD0D C\u0102UTARE \u00EEnregistrare pentru sesiunea " + sess.id + " (" + sess.dailyRoomName + ")");
                    _g.label = 42;
                case 42:
                    _g.trys.push([42, 46, , 47]);
                    return [4 /*yield*/, fetchRecordingFromDaily(sess.dailyRoomName)];
                case 43:
                    recordingData = _g.sent();
                    if (!recordingData) return [3 /*break*/, 45];
                    console.log("\u2705 G\u0102SIT! Actualizez sesiunea " + sess.id + " cu URL: " + recordingData.url);
                    return [4 /*yield*/, prisma_1.prisma.consultingSession.update({
                            where: { id: sess.id },
                            data: {
                                recordingUrl: recordingData.url,
                                hasRecording: true,
                                recordingStatus: recordingData.status,
                                recordingDuration: recordingData.duration,
                                updatedAt: new Date()
                            }
                        })];
                case 44:
                    _g.sent();
                    // Actualizează obiectul local
                    sess.recordingUrl = recordingData.url;
                    sess.hasRecording = true;
                    sess.recordingStatus = recordingData.status;
                    sess.recordingDuration = recordingData.duration;
                    _g.label = 45;
                case 45: return [3 /*break*/, 47];
                case 46:
                    error_6 = _g.sent();
                    console.error("\u274C Eroare la ob\u021Binerea \u00EEnregistr\u0103rii pentru " + sess.id + ":", error_6);
                    return [3 /*break*/, 47];
                case 47:
                    _f++;
                    return [3 /*break*/, 41];
                case 48:
                    mapSessionToResponse_1 = function (sess, userRole) {
                        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
                        try {
                            var counterpart = void 0, counterpartEmail = void 0, counterpartImage = void 0, clientId = null;
                            if (userRole === 'provider') {
                                // Pentru provider, afișează info despre client
                                if (sess.client) {
                                    counterpart = sess.client.name || sess.client.email || 'Client necunoscut';
                                    counterpartEmail = sess.client.email || null;
                                    counterpartImage = sess.client.image || null;
                                    clientId = sess.client.id;
                                }
                                else {
                                    counterpart = 'Client necunoscut';
                                    counterpartEmail = null;
                                    counterpartImage = null;
                                }
                            }
                            else {
                                // Pentru client, afișează info despre provider  
                                counterpart = sess.provider.user.name || sess.provider.user.email || 'Provider necunoscut';
                                counterpartEmail = sess.provider.user.email || null;
                                counterpartImage = sess.provider.user.image || null;
                            }
                            // 🆕 EXTRAGE RECENZIA DIRECT DIN SESIUNE (DEFENSIV)
                            var reviewInfo = {
                                hasReview: false,
                                myReview: null,
                                clientReview: null
                            };
                            try {
                                if (sess.review) {
                                    if (userRole === 'client' && sess.review.fromUserId === userId_1) {
                                        // Pentru client - recenzia pe care a dat-o
                                        reviewInfo = {
                                            hasReview: true,
                                            myReview: {
                                                id: sess.review.id,
                                                rating: sess.review.rating,
                                                comment: sess.review.comment,
                                                date: sess.review.date.toISOString()
                                            },
                                            clientReview: null
                                        };
                                    }
                                    else if (userRole === 'provider' && sess.review.fromUserId === clientId) {
                                        // Pentru provider - recenzia primită de la client
                                        var clientName = ((_a = sess.review.fromUser) === null || _a === void 0 ? void 0 : _a.name) || ((_b = sess.review.fromUser) === null || _b === void 0 ? void 0 : _b.email) || counterpart;
                                        reviewInfo = {
                                            hasReview: false,
                                            myReview: null,
                                            clientReview: {
                                                id: sess.review.id,
                                                rating: sess.review.rating,
                                                comment: sess.review.comment,
                                                date: sess.review.date.toISOString(),
                                                clientName: clientName
                                            }
                                        };
                                    }
                                }
                            }
                            catch (reviewMappingError) {
                                console.error("\u274C Eroare la maparea recenziei pentru sesiunea " + sess.id + ":", reviewMappingError);
                                // Păstrează valorile default pentru reviewInfo
                            }
                            // Determină informațiile despre înregistrare
                            var hasRecording = !!(sess.hasRecording ||
                                sess.recordingUrl ||
                                sess.recordingStatus === 'READY' ||
                                sess.recordingStatus === 'PROCESSING');
                            var recordingInfo = {
                                hasRecording: hasRecording,
                                recordingUrl: sess.recordingUrl,
                                recordingStatus: sess.recordingStatus || 'NONE',
                                recordingAvailable: !!(sess.recordingUrl && sess.recordingStatus === 'READY'),
                                recordingProcessing: sess.recordingStatus === 'PROCESSING'
                            };
                            var baseSessionData = {
                                id: sess.id,
                                startDate: ((_c = sess.startDate) === null || _c === void 0 ? void 0 : _c.toISOString()) || null,
                                endDate: ((_d = sess.endDate) === null || _d === void 0 ? void 0 : _d.toISOString()) || null,
                                joinUrl: sess.dailyRoomUrl || '',
                                roomName: sess.dailyRoomName,
                                roomId: sess.dailyRoomId,
                                counterpart: counterpart,
                                counterpartEmail: counterpartEmail,
                                counterpartImage: counterpartImage,
                                speciality: ((_e = sess.speciality) === null || _e === void 0 ? void 0 : _e.name) || 'Serviciu necunoscut',
                                specialityId: ((_f = sess.speciality) === null || _f === void 0 ? void 0 : _f.id) || null,
                                status: sess.status,
                                duration: sess.duration,
                                actualDuration: sess.actualDuration,
                                isFinished: sess.isFinished,
                                participantCount: sess.participantCount,
                                rating: sess.rating,
                                feedback: sess.feedback,
                                notes: sess.notes,
                                totalPrice: sess.totalPrice,
                                role: userRole,
                                createdAt: ((_g = sess.createdAt) === null || _g === void 0 ? void 0 : _g.toISOString()) || new Date().toISOString(),
                                updatedAt: ((_h = sess.updatedAt) === null || _h === void 0 ? void 0 : _h.toISOString()) || new Date().toISOString(),
                                scheduledAt: ((_j = sess.scheduledAt) === null || _j === void 0 ? void 0 : _j.toISOString()) || null,
                                joinedAt: ((_k = sess.joinedAt) === null || _k === void 0 ? void 0 : _k.toISOString()) || null,
                                leftAt: ((_l = sess.leftAt) === null || _l === void 0 ? void 0 : _l.toISOString()) || null,
                                // Recording information
                                recordingUrl: sess.recordingUrl,
                                hasRecording: recordingInfo.hasRecording,
                                recordingAvailable: recordingInfo.recordingAvailable,
                                recordingProcessing: recordingInfo.recordingProcessing,
                                recordingStarted: sess.recordingStarted || false,
                                recordingStartedAt: ((_m = sess.recordingStartedAt) === null || _m === void 0 ? void 0 : _m.toISOString()) || null,
                                recordingStoppedAt: ((_o = sess.recordingStoppedAt) === null || _o === void 0 ? void 0 : _o.toISOString()) || null,
                                recordingDuration: sess.recordingDuration || null,
                                recordingStatus: sess.recordingStatus || 'NONE',
                                // Daily.co integration
                                dailyRoomName: sess.dailyRoomName,
                                dailyDomainName: sess.dailyDomainName,
                                dailyCreatedAt: ((_p = sess.dailyCreatedAt) === null || _p === void 0 ? void 0 : _p.toISOString()) || null,
                                // Package information
                                packageInfo: sess.userPackage ? {
                                    id: sess.userPackage.id,
                                    service: ((_q = sess.speciality) === null || _q === void 0 ? void 0 : _q.name) || 'Serviciu necunoscut',
                                    totalSessions: sess.userPackage.totalSessions,
                                    usedSessions: sess.userPackage.usedSessions,
                                    remainingSessions: sess.userPackage.totalSessions - sess.userPackage.usedSessions,
                                    expiresAt: ((_r = sess.userPackage.expiresAt) === null || _r === void 0 ? void 0 : _r.toISOString()) || null,
                                    price: ((_s = sess.speciality) === null || _s === void 0 ? void 0 : _s.price) || 0
                                } : null,
                                calendlyEventUri: sess.calendlyEventUri,
                                // 🆕 INFORMAȚII PENTRU RECENZII (SIMPLIFICATE)
                                providerId: userRole === 'client' ? sess.providerId : null,
                                clientId: userRole === 'provider' ? clientId : null,
                                hasReview: reviewInfo.hasReview,
                                myReview: reviewInfo.myReview,
                                clientReview: reviewInfo.clientReview,
                                // Timezone metadata
                                timezone: {
                                    dbTimezone: 'UTC',
                                    serverTimezone: 'UTC',
                                    environment: process.env.NODE_ENV,
                                    needsConversion: false,
                                    offsetApplied: process.env.NODE_ENV === 'production',
                                    note: process.env.NODE_ENV === 'production'
                                        ? 'Production: Datele sunt UTC+3 din Calendly'
                                        : 'Development: Datele sunt în UTC'
                                }
                            };
                            return baseSessionData;
                        }
                        catch (mappingError) {
                            console.error("\u274C Eroare critic\u0103 la maparea sesiunii " + sess.id + ":", mappingError);
                            // Returnează un obiect minimal pentru a preveni crash-ul complet
                            return {
                                id: sess.id || 'unknown',
                                startDate: null,
                                endDate: null,
                                joinUrl: '',
                                roomName: null,
                                roomId: null,
                                counterpart: 'Eroare la încărcare',
                                counterpartEmail: null,
                                counterpartImage: null,
                                speciality: 'Eroare la încărcare',
                                specialityId: null,
                                status: sess.status || 'SCHEDULED',
                                duration: null,
                                actualDuration: null,
                                isFinished: false,
                                participantCount: null,
                                rating: null,
                                feedback: null,
                                notes: null,
                                totalPrice: null,
                                role: userRole,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                scheduledAt: null,
                                joinedAt: null,
                                leftAt: null,
                                recordingUrl: null,
                                hasRecording: false,
                                recordingAvailable: false,
                                recordingProcessing: false,
                                recordingStarted: false,
                                recordingStartedAt: null,
                                recordingStoppedAt: null,
                                recordingDuration: null,
                                recordingStatus: 'NONE',
                                dailyRoomName: null,
                                dailyDomainName: null,
                                dailyCreatedAt: null,
                                packageInfo: null,
                                calendlyEventUri: null,
                                providerId: null,
                                clientId: null,
                                hasReview: false,
                                myReview: null,
                                clientReview: null,
                                timezone: {
                                    dbTimezone: 'UTC',
                                    serverTimezone: 'UTC',
                                    environment: process.env.NODE_ENV,
                                    needsConversion: false,
                                    offsetApplied: false,
                                    note: 'Sesiune cu erori - date minime'
                                }
                            };
                        }
                    };
                    mappedProviderSessions = [];
                    mappedClientSessions = [];
                    try {
                        mappedProviderSessions = providerSessions.map(function (sess) { return mapSessionToResponse_1(sess, 'provider'); });
                        console.log("\u2705 Mapare provider sessions: " + mappedProviderSessions.length);
                    }
                    catch (mappingError) {
                        console.error("\u274C Eroare la maparea sesiunilor provider:", mappingError);
                        mappedProviderSessions = [];
                    }
                    try {
                        mappedClientSessions = clientSessions.map(function (sess) { return mapSessionToResponse_1(sess, 'client'); });
                        console.log("\u2705 Mapare client sessions: " + mappedClientSessions.length);
                    }
                    catch (mappingError) {
                        console.error("\u274C Eroare la maparea sesiunilor client:", mappingError);
                        mappedClientSessions = [];
                    }
                    providerReviewStats_1 = { totalReviews: 0, averageRating: 0 };
                    if (!(isProvider && provider)) return [3 /*break*/, 52];
                    _g.label = 49;
                case 49:
                    _g.trys.push([49, 51, , 52]);
                    return [4 /*yield*/, getProviderReviewStats(provider.id)];
                case 50:
                    providerReviewStats_1 = _g.sent();
                    console.log("\uD83D\uDCCA Statistici recenzii provider:", providerReviewStats_1);
                    return [3 /*break*/, 52];
                case 51:
                    statsError_1 = _g.sent();
                    console.error("\u274C Eroare la calcularea statisticilor provider:", statsError_1);
                    return [3 /*break*/, 52];
                case 52:
                    calculateStats = function (sessions, role) {
                        var baseStats = {
                            total: sessions.length,
                            scheduled: sessions.filter(function (s) { return s.status === 'SCHEDULED'; }).length,
                            inProgress: sessions.filter(function (s) { return s.status === 'IN_PROGRESS'; }).length,
                            completed: sessions.filter(function (s) { return s.status === 'COMPLETED'; }).length,
                            cancelled: sessions.filter(function (s) { return s.status === 'CANCELLED'; }).length,
                            noShow: sessions.filter(function (s) { return s.status === 'NO_SHOW'; }).length,
                            expired: sessions.filter(function (s) { return s.isFinished && s.status === 'NO_SHOW'; }).length,
                            withRecording: sessions.filter(function (s) { return s.hasRecording || s.recordingProcessing; }).length,
                            recordingReady: sessions.filter(function (s) { return s.recordingAvailable; }).length,
                            recordingProcessing: sessions.filter(function (s) { return s.recordingProcessing; }).length
                        };
                        // Adaugă statistici pentru recenzii
                        if (role === 'client') {
                            return __assign(__assign({}, baseStats), { completedWithReviews: sessions.filter(function (s) { return (s.status === 'COMPLETED' || s.isFinished) && s.hasReview; }).length, completedWithoutReviews: sessions.filter(function (s) { return (s.status === 'COMPLETED' || s.isFinished) && !s.hasReview; }).length, totalReviews: sessions.filter(function (s) { return s.hasReview; }).length });
                        }
                        else {
                            // Pentru provider - statistici despre recenziile primite
                            return __assign(__assign({}, baseStats), { totalReviews: providerReviewStats_1.totalReviews, averageRating: providerReviewStats_1.averageRating });
                        }
                    };
                    stats = {
                        provider: calculateStats(mappedProviderSessions, 'provider'),
                        client: calculateStats(mappedClientSessions, 'client')
                    };
                    nowUTC = new Date();
                    isProduction = process.env.NODE_ENV === 'production';
                    ROMANIA_OFFSET = isProduction ? 3 * 60 * 60 * 1000 : 0;
                    nowAdjusted = new Date(nowUTC.getTime() + ROMANIA_OFFSET);
                    // === LOG PENTRU DEBUGGING ===
                    console.log("\uD83D\uDCCA Rezumat actualiz\u0103ri sesiuni pentru user " + userId_1 + ":", {
                        totalSessions: allSessions.length,
                        sessionsUpdated: sessionsToUpdate.length,
                        updates: sessionsToUpdate.map(function (s) { return ({
                            id: s.id,
                            newStatus: s.status,
                            reason: s.reason
                        }); }),
                        environment: process.env.NODE_ENV,
                        serverTimeUTC: nowUTC.toISOString(),
                        adjustedTime: nowAdjusted.toISOString(),
                        offsetApplied: ROMANIA_OFFSET / (60 * 60 * 1000) + " hours",
                        reviewsIncluded: 'Direct from session relations'
                    });
                    console.log("\uD83D\uDCC8 Statistici DUAL pentru user " + userId_1 + ":", {
                        provider: stats.provider,
                        client: stats.client,
                        total: mappedProviderSessions.length + mappedClientSessions.length,
                        reviews: {
                            clientReviews: mappedClientSessions.filter(function (s) { return s.hasReview; }).length,
                            providerReviews: mappedProviderSessions.filter(function (s) { return s.clientReview; }).length,
                            providerStats: providerReviewStats_1
                        }
                    });
                    return [2 /*return*/, server_1.NextResponse.json({
                            providerSessions: mappedProviderSessions,
                            clientSessions: mappedClientSessions,
                            totalCount: mappedProviderSessions.length + mappedClientSessions.length,
                            isProvider: isProvider,
                            stats: stats,
                            providerId: (provider === null || provider === void 0 ? void 0 : provider.id) || null,
                            sessionsUpdated: sessionsToUpdate.length,
                            // 🆕 INFORMAȚII DESPRE RECENZII (SIMPLIFICATE)
                            reviewsInfo: {
                                client: {
                                    totalReviews: mappedClientSessions.filter(function (s) { return s.hasReview; }).length,
                                    sessionsWithReviews: mappedClientSessions.filter(function (s) { return s.hasReview; }).length,
                                    sessionsWithoutReviews: mappedClientSessions.filter(function (s) { return !s.hasReview && (s.status === 'COMPLETED' || s.isFinished); }).length
                                },
                                provider: {
                                    totalReviews: providerReviewStats_1.totalReviews,
                                    averageRating: providerReviewStats_1.averageRating,
                                    sessionsWithReviews: mappedProviderSessions.filter(function (s) { return s.clientReview; }).length
                                }
                            },
                            // METADATA DESPRE TIMEZONE
                            timezoneInfo: {
                                serverTimeUTC: nowUTC.toISOString(),
                                adjustedTime: nowAdjusted.toISOString(),
                                environment: process.env.NODE_ENV,
                                dbTimezone: 'UTC (Development)',
                                serverTimezone: 'UTC',
                                offsetHours: ROMANIA_OFFSET / (60 * 60 * 1000),
                                offsetApplied: isProduction,
                                note: isProduction
                                    ? 'Production: Datele din DB sunt UTC+3, comparațiile sunt ajustate cu +3 ore'
                                    : 'Development: Comparațiile se fac direct în UTC fără ajustare'
                            },
                            // INFORMAȚII DESPRE ACTUALIZĂRILE DE STATUS
                            statusUpdates: {
                                total: sessionsToUpdate.length,
                                byStatus: sessionsToUpdate.reduce(function (acc, s) {
                                    acc[s.status] = (acc[s.status] || 0) + 1;
                                    return acc;
                                }, {}),
                                details: process.env.NODE_ENV === 'development' ? sessionsToUpdate : undefined
                            }
                        })];
                case 53:
                    error_7 = _g.sent();
                    console.error("❌ Error fetching dual sessions:", error_7);
                    console.error("❌ Error stack:", error_7.stack);
                    return [2 /*return*/, server_1.NextResponse.json({
                            error: "Eroare internă la obținerea sesiunilor",
                            details: process.env.NODE_ENV === 'development' ? error_7.message : undefined
                        }, { status: 500 })];
                case 54: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
// Funcție pentru verificarea și actualizarea statusurilor sesiunilor
function checkAndUpdateSessionStatus(session) {
    var nowUTC = new Date();
    // Aplicare offset doar în production
    var isProduction = process.env.NODE_ENV === 'production';
    var ROMANIA_OFFSET = isProduction ? 3 * 60 * 60 * 1000 : 0;
    var nowAdjusted = new Date(nowUTC.getTime() + ROMANIA_OFFSET);
    // Dacă sesiunea este deja finalizată manual, nu o mai modifică
    if (session.isFinished && ['COMPLETED', 'CANCELLED'].includes(session.status)) {
        return {
            needsUpdate: false,
            newStatus: session.status,
            newIsFinished: session.isFinished,
            reason: 'Sesiunea este deja finalizată manual'
        };
    }
    var startDate = session.startDate ? new Date(session.startDate) : null;
    var endDate = session.endDate ? new Date(session.endDate) : null;
    var scheduledAt = session.scheduledAt ? new Date(session.scheduledAt) : null;
    // CAZ 1: Sesiunea ar trebui să fie COMPLETATĂ (timpul a trecut)
    if (endDate && nowAdjusted > endDate) {
        return {
            needsUpdate: session.status !== 'COMPLETED' || !session.isFinished,
            newStatus: 'COMPLETED',
            newIsFinished: true,
            reason: 'Timpul sesiunii a expirat - marcată ca COMPLETATĂ'
        };
    }
    // CAZ 2: Sesiunea ar trebui să fie ÎN PROGRES (între start și end)
    if (startDate && endDate && nowAdjusted >= startDate && nowAdjusted <= endDate) {
        return {
            needsUpdate: session.status !== 'IN_PROGRESS',
            newStatus: 'IN_PROGRESS',
            newIsFinished: false,
            reason: 'Sesiunea este în intervalul de timp programat'
        };
    }
    // CAZ 3: Sesiunea a trecut cu mult timp și nu a fost completată (NO_SHOW)
    var bufferTime = 2 * 60 * 60 * 1000; // 2 ore buffer
    if (endDate && nowAdjusted > new Date(endDate.getTime() + bufferTime) && session.status === 'SCHEDULED') {
        return {
            needsUpdate: true,
            newStatus: 'NO_SHOW',
            newIsFinished: true,
            reason: 'Sesiunea a expirat cu buffer de 2 ore - marcată ca NO_SHOW'
        };
    }
    // CAZ 4: Sesiunea programată a trecut de timpul de start dar nu e în progres (NO_SHOW)
    if (startDate && nowAdjusted > new Date(startDate.getTime() + bufferTime) && session.status === 'SCHEDULED') {
        return {
            needsUpdate: true,
            newStatus: 'NO_SHOW',
            newIsFinished: true,
            reason: 'Sesiunea nu a început în timpul alocat - marcată ca NO_SHOW'
        };
    }
    // CAZ 5: Verificare prin scheduledAt dacă nu avem startDate/endDate
    if (!startDate && !endDate && scheduledAt && nowAdjusted > new Date(scheduledAt.getTime() + bufferTime) && session.status === 'SCHEDULED') {
        return {
            needsUpdate: true,
            newStatus: 'NO_SHOW',
            newIsFinished: true,
            reason: 'Sesiunea programată a expirat - marcată ca NO_SHOW'
        };
    }
    // Nicio schimbare necesară
    return {
        needsUpdate: false,
        newStatus: session.status,
        newIsFinished: session.isFinished,
        reason: 'Statusul sesiunii este corect'
    };
}
// Funcție helper pentru a obține înregistrarea de la Daily.co
function fetchRecordingFromDaily(roomName) {
    return __awaiter(this, void 0, Promise, function () {
        var dailyApiKey, response, data, recordings, recording, result, error_8;
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
                    console.log("\uD83D\uDD0D C\u0102UTARE Daily.co pentru camera: " + roomName);
                    return [4 /*yield*/, fetch("https://api.daily.co/v1/recordings?limit=100", {
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
                    console.log("\uD83D\uDCCA Verificare din " + recordings.length + " \u00EEnregistr\u0103ri Daily.co");
                    recording = recordings.find(function (r) { return r.room_name === roomName; });
                    // Dacă nu găsește exact, încearcă căutare fuzzy
                    if (!recording) {
                        console.log("\uD83D\uDD0D C\u0103utare exact\u0103 e\u0219uat\u0103 pentru " + roomName + ", \u00EEncerc c\u0103utare fuzzy...");
                        recording = recordings.find(function (r) {
                            return r.room_name && roomName &&
                                (r.room_name.includes(roomName) || roomName.includes(r.room_name));
                        });
                        if (recording) {
                            console.log("\u2705 G\u0103sit cu c\u0103utare fuzzy: " + recording.room_name + " pentru " + roomName);
                        }
                    }
                    if (recording) {
                        console.log("\u2705 \u00CEnregistrare g\u0103sit\u0103:", {
                            id: recording.id,
                            room_name: recording.room_name,
                            status: recording.status,
                            duration: recording.duration,
                            download_link: recording.download_link ? 'Available' : 'Not ready'
                        });
                        result = {
                            url: recording.download_link || null,
                            status: recording.status === 'finished' ? 'READY' :
                                recording.status === 'in-progress' ? 'PROCESSING' :
                                    recording.status === 'failed' ? 'FAILED' : 'UNKNOWN',
                            duration: recording.duration ? Math.round(recording.duration / 60) : null
                        };
                        if (result.url || result.status === 'PROCESSING') {
                            return [2 /*return*/, result];
                        }
                    }
                    else {
                        console.log("\u274C Nu s-a g\u0103sit \u00EEnregistrare pentru camera " + roomName);
                    }
                    return [2 /*return*/, null];
                case 4:
                    error_8 = _a.sent();
                    console.error('❌ Error fetching recording from Daily.co:', error_8);
                    return [2 /*return*/, null];
                case 5: return [2 /*return*/];
            }
        });
    });
}
