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
// /api/calendly/event-scheduled/route.ts - VERSIUNE ÎMBUNĂTĂȚITĂ CU REMINDER-URI ROBUSTE
exports.runtime = "nodejs";
var server_1 = require("next/server");
var next_1 = require("next-auth/next");
var auth_1 = require("@/lib/auth");
var prisma_1 = require("@/lib/prisma");
// import { 
//   scheduleRemindersForCalendlySession,
//   sendCalendlyConfirmationEmail 
// } from '@/lib/schema-adapter';
// Funcție pentru crearea unei camere Daily.co (neschimbată)
function createDailyRoom(sessionId, endTime) {
    var _a, _b;
    return __awaiter(this, void 0, Promise, function () {
        var dailyApiKey, dailyDomain, extendedEndTime, exp, roomProperties, apiPost, room, token;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!process.env.DAILY_API_KEY) {
                        throw new Error('DAILY_API_KEY is required');
                    }
                    dailyApiKey = process.env.DAILY_API_KEY;
                    dailyDomain = (_a = process.env.DAILY_DOMAIN) !== null && _a !== void 0 ? _a : 'mysticgold.daily.co';
                    extendedEndTime = new Date(endTime.getTime() + 5 * 60 * 1000);
                    exp = Math.floor(extendedEndTime.getTime() / 1000);
                    console.log("\u23F0 Timp original (Calendly): " + endTime.toISOString());
                    console.log("\u23F0 Timp extins (+5 min buffer): " + extendedEndTime.toISOString());
                    roomProperties = {
                        enable_recording: 'cloud',
                        max_participants: 10,
                        enable_chat: true,
                        enable_screenshare: true,
                        start_video_off: false,
                        start_audio_off: false,
                        exp: exp,
                        eject_at_room_exp: true,
                        enable_prejoin_ui: true,
                        enable_network_ui: true,
                        enable_people_ui: true,
                        lang: 'en',
                        geo: 'auto'
                    };
                    apiPost = function (path, body) { return __awaiter(_this, void 0, void 0, function () {
                        var res, text;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, fetch("https://api.daily.co/v1/" + path, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            Authorization: "Bearer " + dailyApiKey
                                        },
                                        body: JSON.stringify(body)
                                    })];
                                case 1:
                                    res = _a.sent();
                                    if (!!res.ok) return [3 /*break*/, 3];
                                    return [4 /*yield*/, res.text()];
                                case 2:
                                    text = _a.sent();
                                    throw new Error("Daily API error (" + path + "): " + text);
                                case 3: return [2 /*return*/, res.json()];
                            }
                        });
                    }); };
                    return [4 /*yield*/, apiPost('rooms', {
                            name: "calendly-session-" + sessionId,
                            privacy: 'private',
                            properties: roomProperties
                        })];
                case 1:
                    room = _c.sent();
                    return [4 /*yield*/, apiPost('meeting-tokens', {
                            properties: {
                                room_name: room.name,
                                exp: Math.floor(Date.now() / 1000) + 24 * 3600,
                                eject_at_token_exp: true,
                                enable_recording: 'cloud',
                                start_cloud_recording: true,
                                start_cloud_recording_opts: {
                                    layout: { preset: 'grid' }
                                }
                            }
                        })];
                case 2:
                    token = (_c.sent()).token;
                    console.log("\uD83C\uDFA5 Camer\u0103 Daily.co creat\u0103 cu succes:");
                    console.log("   - Room: " + room.name);
                    console.log("   - Expiry: " + extendedEndTime.toISOString() + " (+5 min buffer)");
                    console.log("   - Token expir\u0103: " + new Date((Math.floor(Date.now() / 1000) + 24 * 3600) * 1000).toISOString() + " (24h de la crearea token-ului)");
                    console.log("   - Recording layout: grid (fix pentru active-speaker error)");
                    // 5. returnează URL-ul cu token
                    return [2 /*return*/, {
                            roomUrl: room.url + "?t=" + token,
                            roomName: room.name,
                            roomId: room.id,
                            domainName: (_b = room.domain_name) !== null && _b !== void 0 ? _b : dailyDomain,
                            originalEndTime: endTime,
                            extendedEndTime: extendedEndTime
                        }];
            }
        });
    });
}
// 🆕 Funcție pentru validarea și obținerea pachetului (neschimbată)
function validateUserPackage(packageId, userId, providerId) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var userPackage, actualUsedSessions, remainingSessions;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("\uD83D\uDD0D Validare pachet: " + packageId + " pentru user " + userId + " \u0219i provider " + providerId);
                    return [4 /*yield*/, prisma_1.prisma.userProviderPackage.findFirst({
                            where: {
                                id: packageId,
                                userId: userId,
                                providerId: providerId
                            },
                            include: {
                                providerPackage: {
                                    select: {
                                        service: true,
                                        price: true
                                    }
                                },
                                provider: {
                                    select: {
                                        mainSpecialityId: true,
                                        user: {
                                            select: {
                                                name: true,
                                                email: true
                                            }
                                        }
                                    }
                                },
                                _count: {
                                    select: {
                                        sessions: {
                                            where: {
                                                wasPackageSession: true,
                                                status: {
                                                    not: 'CANCELLED'
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        })];
                case 1:
                    userPackage = _b.sent();
                    if (!userPackage) {
                        console.error("\u274C Pachetul " + packageId + " nu a fost g\u0103sit sau nu apar\u021Bine user-ului " + userId);
                        throw new Error('Pachetul nu a fost găsit sau nu vă aparține');
                    }
                    actualUsedSessions = userPackage._count.sessions;
                    remainingSessions = userPackage.totalSessions - actualUsedSessions;
                    console.log("\uD83D\uDCCA Statistici pachet: " + actualUsedSessions + "/" + userPackage.totalSessions + " sesiuni folosite, " + remainingSessions + " r\u0103mase");
                    if (remainingSessions <= 0) {
                        console.error("\u274C Pachetul " + packageId + " nu mai are sesiuni disponibile (" + actualUsedSessions + "/" + userPackage.totalSessions + ")");
                        throw new Error('Pachetul nu mai are sesiuni disponibile');
                    }
                    if (userPackage.expiresAt && userPackage.expiresAt < new Date()) {
                        console.error("\u274C Pachetul " + packageId + " a expirat la " + userPackage.expiresAt);
                        throw new Error('Pachetul a expirat');
                    }
                    console.log("\u2705 Pachet valid: " + ((_a = userPackage.providerPackage) === null || _a === void 0 ? void 0 : _a.service) + " - " + remainingSessions + " sesiuni r\u0103mase");
                    return [2 /*return*/, {
                            userPackage: userPackage,
                            actualUsedSessions: actualUsedSessions,
                            remainingSessions: remainingSessions
                        }];
            }
        });
    });
}
function POST(request) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    return __awaiter(this, void 0, void 0, function () {
        // ————————————————————————————————
        // REFRESH TOKEN HELPER (neschimbat)
        // ————————————————————————————————
        function refreshCalendlyToken() {
            return __awaiter(this, void 0, Promise, function () {
                var params, response, tokenData;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!refreshToken_1) {
                                console.warn('⚠️ Nu există refresh token pentru provider');
                                return [2 /*return*/, false];
                            }
                            if (expiresAt_1 && new Date() < expiresAt_1) {
                                console.log('✅ Token-ul Calendly este încă valid');
                                return [2 /*return*/, false]; // Nu e nevoie de refresh
                            }
                            console.log('🔄 Refresh token Calendly...');
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
                            response = _a.sent();
                            if (!response.ok) {
                                console.error('❌ Refresh token failed:', response.statusText);
                                return [2 /*return*/, false];
                            }
                            return [4 /*yield*/, response.json()];
                        case 2:
                            tokenData = _a.sent();
                            // Actualizează variabilele locale
                            token_1 = tokenData.access_token;
                            refreshToken_1 = tokenData.refresh_token;
                            expiresAt_1 = new Date(Date.now() + tokenData.expires_in * 1000);
                            // Salvează în baza de date
                            return [4 /*yield*/, prisma_1.prisma.provider.update({
                                    where: { id: provider_1.id },
                                    data: {
                                        calendlyAccessToken: token_1,
                                        calendlyRefreshToken: refreshToken_1,
                                        calendlyExpiresAt: expiresAt_1
                                    }
                                })];
                        case 3:
                            // Salvează în baza de date
                            _a.sent();
                            console.log('✅ Token Calendly actualizat cu succes');
                            return [2 /*return*/, true];
                    }
                });
            });
        }
        var session, currentUserId, _k, providerId, scheduledEventUri_1, packageId_1, provider_1, token_1, refreshToken_1, expiresAt_1, _l, userPackage_1, actualUsedSessions, remainingSessions_1, response, refreshed, errorText, eventDetails, eventData, startTime_1, originalEndTime_1, clientEmail_1, clientName_1, clientUser_1, sessionId_1, dailyRoom_1, estimatedDuration_1, result, err_1, message;
        var _this = this;
        return __generator(this, function (_m) {
            switch (_m.label) {
                case 0:
                    _m.trys.push([0, 15, , 16]);
                    console.log('📅 Procesare eveniment Calendly cu pachete, extensie 5 minute și reminder-uri BullMQ optimizate');
                    return [4 /*yield*/, next_1.getServerSession(auth_1.authOptions)];
                case 1:
                    session = _m.sent();
                    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
                        console.error('❌ Unauthorized: No authenticated user');
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Authentication required' }, { status: 401 })];
                    }
                    currentUserId = session.user.id;
                    console.log("\uD83D\uDC64 Client autentificat: " + currentUserId);
                    return [4 /*yield*/, request.json()];
                case 2:
                    _k = _m.sent(), providerId = _k.providerId, scheduledEventUri_1 = _k.scheduledEventUri, packageId_1 = _k.packageId;
                    console.log("\uD83D\uDCCA Calendly event data:", {
                        providerId: providerId,
                        scheduledEventUri: scheduledEventUri_1,
                        packageId: packageId_1,
                        clientId: currentUserId
                    });
                    // VALIDARE INPUT
                    if (!providerId) {
                        console.error('❌ providerId lipsește');
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'providerId este obligatoriu' }, { status: 400 })];
                    }
                    if (!scheduledEventUri_1) {
                        console.error('❌ scheduledEventUri lipsește');
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'scheduledEventUri este obligatoriu' }, { status: 400 })];
                    }
                    // 🆕 Validare packageId
                    if (!packageId_1) {
                        console.error('❌ packageId lipsește');
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'packageId este obligatoriu pentru programare' }, { status: 400 })];
                    }
                    // ————————————————————————————————
                    // ÎNCARCĂ PROVIDER-UL CU TOKEN-URILE CALENDLY
                    // ————————————————————————————————
                    console.log("\uD83D\uDD0D C\u0103utare provider cu token-uri Calendly: " + providerId);
                    return [4 /*yield*/, prisma_1.prisma.provider.findUnique({
                            where: { userId: providerId },
                            select: {
                                id: true,
                                userId: true,
                                calendlyAccessToken: true,
                                calendlyRefreshToken: true,
                                calendlyExpiresAt: true,
                                mainSpeciality: {
                                    select: {
                                        id: true,
                                        name: true,
                                        price: true
                                    }
                                },
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true
                                    }
                                }
                            }
                        })];
                case 3:
                    provider_1 = _m.sent();
                    if (!provider_1) {
                        console.error("\u274C Provider-ul cu ID " + providerId + " nu a fost g\u0103sit");
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Provider-ul cu ID " + providerId + " nu a fost g\u0103sit" }, { status: 404 })];
                    }
                    token_1 = provider_1.calendlyAccessToken, refreshToken_1 = provider_1.calendlyRefreshToken, expiresAt_1 = provider_1.calendlyExpiresAt;
                    if (!token_1) {
                        console.error("\u274C Provider-ul " + providerId + " nu are token Calendly configurat");
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Provider-ul nu are autentificare Calendly configurată' }, { status: 400 })];
                    }
                    console.log("\u2705 Provider g\u0103sit: " + (provider_1.user.name || provider_1.user.email) + " (" + provider_1.id + ")");
                    // 🆕 VALIDEAZĂ PACHETUL ÎNAINTE DE CALENDLY
                    console.log('🔍 Validare pachet...');
                    return [4 /*yield*/, validateUserPackage(packageId_1, currentUserId, provider_1.id)];
                case 4:
                    _l = _m.sent(), userPackage_1 = _l.userPackage, actualUsedSessions = _l.actualUsedSessions, remainingSessions_1 = _l.remainingSessions;
                    // ————————————————————————————————
                    // OBȚINE DETALIILE EVENIMENTULUI CALENDLY (neschimbat)
                    // ————————————————————————————————
                    console.log('📞 Obținere detalii eveniment Calendly...');
                    return [4 /*yield*/, fetch(scheduledEventUri_1, {
                            headers: {
                                'Authorization': "Bearer " + token_1,
                                'Content-Type': 'application/json'
                            }
                        })];
                case 5:
                    response = _m.sent();
                    if (!(response.status === 401)) return [3 /*break*/, 8];
                    console.log('🔄 Token expirat, încerc refresh...');
                    return [4 /*yield*/, refreshCalendlyToken()];
                case 6:
                    refreshed = _m.sent();
                    if (!refreshed) return [3 /*break*/, 8];
                    return [4 /*yield*/, fetch(scheduledEventUri_1, {
                            headers: {
                                'Authorization': "Bearer " + token_1,
                                'Content-Type': 'application/json'
                            }
                        })];
                case 7:
                    response = _m.sent();
                    _m.label = 8;
                case 8:
                    if (!!response.ok) return [3 /*break*/, 10];
                    return [4 /*yield*/, response.text()];
                case 9:
                    errorText = _m.sent();
                    console.error('❌ Eroare la obținerea detaliilor Calendly:', errorText);
                    throw new Error("Failed to fetch Calendly event: " + response.statusText);
                case 10: return [4 /*yield*/, response.json()];
                case 11:
                    eventDetails = _m.sent();
                    eventData = eventDetails.resource;
                    startTime_1 = new Date(eventData.start_time);
                    originalEndTime_1 = new Date(eventData.end_time);
                    clientEmail_1 = (_c = (_b = eventData.event_memberships) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.user_email;
                    clientName_1 = (_e = (_d = eventData.event_memberships) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.user_name;
                    console.log("\u23F0 Timp programat (din Calendly): " + startTime_1.toISOString() + " - " + originalEndTime_1.toISOString());
                    console.log("\uD83D\uDCE7 Client din Calendly: " + clientName_1 + " (" + clientEmail_1 + ")");
                    // Verifică că utilizatorul curent există în baza de date
                    console.log("\uD83D\uDD0D Verificare utilizator curent: " + currentUserId);
                    return [4 /*yield*/, prisma_1.prisma.user.findUnique({
                            where: { id: currentUserId },
                            select: { id: true, name: true, email: true, role: true }
                        })];
                case 12:
                    clientUser_1 = _m.sent();
                    if (!clientUser_1) {
                        console.error("\u274C Utilizatorul autentificat " + currentUserId + " nu exist\u0103 \u00EEn baza de date");
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Utilizatorul autentificat nu a fost găsit în baza de date' }, { status: 404 })];
                    }
                    console.log("\u2705 Client confirmat: " + (clientUser_1.name || clientUser_1.email) + " (" + clientUser_1.id + ") - Role: " + clientUser_1.role);
                    // Verifică că clientul și provider-ul sunt diferiți
                    if (clientUser_1.id === provider_1.userId) {
                        console.error("\u274C Clientul " + clientUser_1.id + " \u0219i provider-ul " + provider_1.userId + " sunt aceea\u0219i persoan\u0103");
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Nu vă puteți programa o sesiune cu dvs. însuși' }, { status: 400 })];
                    }
                    sessionId_1 = "calendly_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
                    console.log("\uD83C\uDD94 ID sesiune generat: " + sessionId_1);
                    // 🆕 Creează camera Daily.co cu extensie de 5 minute
                    console.log('🎥 Creare cameră Daily.co cu buffer de 5 minute...');
                    return [4 /*yield*/, createDailyRoom(sessionId_1, originalEndTime_1)];
                case 13:
                    dailyRoom_1 = _m.sent();
                    estimatedDuration_1 = Math.round((originalEndTime_1.getTime() - startTime_1.getTime()) / (1000 * 60));
                    // 🆕 CREEAZĂ SESIUNEA ÎN TRANZACȚIE CU PACHETE ȘI INCREMENTAREA SESIUNILOR FOLOSITE
                    console.log('💾 Salvare sesiune în baza de date cu pachete...');
                    return [4 /*yield*/, prisma_1.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            var currentPackage, currentUsedSessions, sessionNumber, sessionRecord, updatedPackage;
                            var _a, _b, _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0: return [4 /*yield*/, tx.userProviderPackage.findUnique({
                                            where: { id: packageId_1 },
                                            include: {
                                                _count: {
                                                    select: {
                                                        sessions: {
                                                            where: {
                                                                wasPackageSession: true,
                                                                status: { not: 'CANCELLED' }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        })];
                                    case 1:
                                        currentPackage = _d.sent();
                                        if (!currentPackage) {
                                            console.error("\u274C Pachetul " + packageId_1 + " nu mai exist\u0103");
                                            throw new Error('Pachetul nu mai există');
                                        }
                                        currentUsedSessions = currentPackage._count.sessions;
                                        if (currentUsedSessions >= currentPackage.totalSessions) {
                                            console.error("\u274C Pachetul " + packageId_1 + " nu mai are sesiuni disponibile \u00EEn tranzac\u021Bie (" + currentUsedSessions + "/" + currentPackage.totalSessions + ")");
                                            throw new Error('Pachetul nu mai are sesiuni disponibile');
                                        }
                                        sessionNumber = currentUsedSessions + 1;
                                        console.log("\uD83D\uDCDD Creez sesiunea #" + sessionNumber + " din pachetul " + ((_a = userPackage_1.providerPackage) === null || _a === void 0 ? void 0 : _a.service));
                                        return [4 /*yield*/, tx.consultingSession.create({
                                                data: {
                                                    id: sessionId_1,
                                                    providerId: provider_1.id,
                                                    clientId: clientUser_1.id,
                                                    // 🆕 Detalii pachete
                                                    packageId: packageId_1,
                                                    wasPackageSession: true,
                                                    packageSessionNumber: sessionNumber,
                                                    // Daily.co details
                                                    dailyRoomName: dailyRoom_1.roomName,
                                                    dailyRoomUrl: dailyRoom_1.roomUrl,
                                                    dailyRoomId: dailyRoom_1.roomId,
                                                    dailyDomainName: dailyRoom_1.domainName,
                                                    dailyCreatedAt: new Date(),
                                                    // Session details
                                                    startDate: startTime_1,
                                                    endDate: originalEndTime_1,
                                                    duration: estimatedDuration_1,
                                                    calendlyEventUri: scheduledEventUri_1,
                                                    scheduledAt: new Date(),
                                                    status: 'SCHEDULED',
                                                    notes: "Sesiune #" + sessionNumber + " din pachetul " + ((_b = userPackage_1.providerPackage) === null || _b === void 0 ? void 0 : _b.service) + ". Programat\u0103 prin Calendly pentru " + (clientUser_1.name || clientUser_1.email) + ". Camera Daily.co extins\u0103 cu 5 minute buffer (p\u00E2n\u0103 la " + dailyRoom_1.extendedEndTime.toISOString() + "). Calendly client: " + clientName_1 + " (" + clientEmail_1 + "). Timezone: UTC+3 (p\u0103strat din Calendly). Recording layout: grid (fix pentru active-speaker error).",
                                                    createdAt: new Date(),
                                                    updatedAt: new Date()
                                                }
                                            })];
                                    case 2:
                                        sessionRecord = _d.sent();
                                        return [4 /*yield*/, tx.userProviderPackage.update({
                                                where: { id: packageId_1 },
                                                data: {
                                                    usedSessions: { increment: 1 }
                                                }
                                            })];
                                    case 3:
                                        updatedPackage = _d.sent();
                                        console.log("\uD83D\uDCCA Incrementat usedSessions pentru pachetul " + packageId_1 + ": " + currentPackage.usedSessions + " \u2192 " + updatedPackage.usedSessions);
                                        return [2 /*return*/, {
                                                session: sessionRecord,
                                                packageInfo: {
                                                    sessionNumber: sessionNumber,
                                                    remainingSessions: remainingSessions_1 - 1,
                                                    totalSessions: userPackage_1.totalSessions,
                                                    packageName: ((_c = userPackage_1.providerPackage) === null || _c === void 0 ? void 0 : _c.service) || 'Pachet Consultații',
                                                    packageId: packageId_1,
                                                    usedSessions: updatedPackage.usedSessions,
                                                    oldUsedSessions: currentPackage.usedSessions
                                                }
                                            }];
                                }
                            });
                        }); })];
                case 14:
                    result = _m.sent();
                    // 🆕 PROGRAMEAZĂ REMINDER-URILE CU ADAPTER-UL ACTUALIZAT
                    console.log('📬 Programare reminder-uri BullMQ cu adapter...');
                    // const calendlySessionData = {
                    //   sessionId: result.session.id,
                    //   clientId: clientUser.id,
                    //   providerId: provider.id,
                    //   clientEmail: clientUser.email!,
                    //   clientName: clientUser.name || clientName || 'Client',
                    //   providerName: provider.user.name || provider.user.email!,
                    //   sessionStartTime: startTime,
                    //   sessionEndTime: originalEndTime,
                    //   dailyRoomUrl: dailyRoom.roomUrl,
                    //   sessionNotes: result.session.notes,
                    //   packageInfo: {
                    //     packageId: result.packageInfo.packageId,
                    //     sessionNumber: result.packageInfo.sessionNumber,
                    //     remainingSessions: result.packageInfo.remainingSessions,
                    //     packageName: result.packageInfo.packageName
                    //   }
                    // };
                    // let reminderResult = { success: false, scheduledCount: 0, message: 'Not attempted' };
                    // try {
                    //   reminderResult = await scheduleRemindersForCalendlySession(calendlySessionData);
                    //   if (reminderResult.success) {
                    //     console.log(`✅ Reminder-uri programate cu succes: ${reminderResult.scheduledCount} job-uri`);
                    //   } else {
                    //     console.warn(`⚠️ Nu s-au putut programa reminder-urile: ${reminderResult.message}`);
                    //   }
                    // } catch (reminderError) {
                    //   console.error('❌ Eroare la programarea reminder-urilor:', reminderError);
                    //   reminderResult = { 
                    //     success: false, 
                    //     scheduledCount: 0, 
                    //     message: reminderError instanceof Error ? reminderError.message : 'Unknown error'
                    //   };
                    // }
                    // 🆕 TRIMITE EMAIL DE CONFIRMARE CU ADAPTER-UL
                    console.log('📧 Trimitere email de confirmare cu adapter...');
                    // let confirmationSent = false;
                    // try {
                    //   await sendCalendlyConfirmationEmail(calendlySessionData);
                    //   confirmationSent = true;
                    //   console.log('✅ Email de confirmare trimis cu succes');
                    // } catch (emailError) {
                    //   console.warn('⚠️ Nu s-a putut trimite email-ul de confirmare:', emailError);
                    //   // Nu eșuăm request-ul pentru o problemă de email
                    // }
                    console.log("\u2705 \u0218edin\u021B\u0103 salvat\u0103 cu succes din pachet:");
                    console.log("   - ID: " + sessionId_1);
                    console.log("   - Client: " + (clientUser_1.name || clientUser_1.email) + " (" + clientUser_1.id + ")");
                    console.log("   - Provider: " + (provider_1.user.name || provider_1.user.email) + " (" + provider_1.id + ")");
                    console.log("   - Camera Daily.co: " + dailyRoom_1.roomUrl);
                    console.log("   - \uD83D\uDD27 Timp (UTC+3 din Calendly): " + startTime_1.toISOString() + " - " + originalEndTime_1.toISOString());
                    console.log("   - \uD83C\uDD95 Timp extins Daily.co: " + dailyRoom_1.extendedEndTime.toISOString() + " (+5 min buffer)");
                    console.log("   - \uD83C\uDD95 Pachet: " + result.packageInfo.packageName + " (sesiunea #" + result.packageInfo.sessionNumber + ")");
                    console.log("   - \uD83C\uDD95 Sesiuni folosite: " + result.packageInfo.oldUsedSessions + " \u2192 " + result.packageInfo.usedSessions);
                    console.log("   - \uD83C\uDD95 Sesiuni r\u0103mase: " + result.packageInfo.remainingSessions);
                    console.log("   - \uD83D\uDCEC Reminder-uri: " + (reminderResult.scheduledCount || 0) + " programate");
                    // console.log(`   - 📧 Email confirmare: ${confirmationSent ? 'trimis' : 'eșuat'}`);
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            sessionId: result.session.id,
                            roomUrl: result.session.dailyRoomUrl,
                            joinUrl: "/servicii/video/sessions/" + result.session.id,
                            message: "Sesiunea #" + result.packageInfo.sessionNumber + " a fost programat\u0103 cu succes din pachetul " + result.packageInfo.packageName + "! " + (confirmationSent ? 'Vei primi reminder-uri prin email.' : 'Email-urile de confirmare vor fi trimise în curând.'),
                            details: {
                                sessionId: result.session.id,
                                startDate: (_f = result.session.startDate) === null || _f === void 0 ? void 0 : _f.toISOString(),
                                endDate: (_g = result.session.endDate) === null || _g === void 0 ? void 0 : _g.toISOString(),
                                duration: result.session.duration,
                                // 🆕 Informații pachete
                                packageInfo: result.packageInfo,
                                // 🆕 Informații reminder-uri îmbunătățite
                                reminders: {
                                    scheduled: reminderResult.success,
                                    count: reminderResult.scheduledCount || 0,
                                    jobIds: reminderResult.jobIds || [],
                                    message: reminderResult.success ?
                                        reminderResult.scheduledCount + " reminder-uri programate cu succes (24h, 1h, la timp)" :
                                        "Reminder-uri nu au putut fi programate: " + reminderResult.message,
                                    details: reminderResult.success ? {
                                        reminder24h: 'Programat cu 24h înainte',
                                        reminder1h: 'Programat cu 1h înainte',
                                        reminderAtTime: 'Programat cu 2 minute înainte'
                                    } : null
                                },
                                // 🆕 Informații email confirmare
                                confirmation: {
                                    sent: confirmationSent,
                                    message: confirmationSent ?
                                        'Email de confirmare trimis cu detalii pachet' :
                                        'Email de confirmare va fi retrimis automat'
                                },
                                // Informații existente...
                                timeInfo: {
                                    scheduledStart: (_h = result.session.startDate) === null || _h === void 0 ? void 0 : _h.toISOString(),
                                    scheduledEnd: (_j = result.session.endDate) === null || _j === void 0 ? void 0 : _j.toISOString(),
                                    dailyRoomExpiresAt: dailyRoom_1.extendedEndTime.toISOString(),
                                    bufferMinutes: 5,
                                    note: 'Camera Daily.co are 5 minute buffer față de timpul programat în Calendly',
                                    dbTimezone: 'UTC+3',
                                    calendlyTimezone: 'UTC+3 (România)',
                                    serverTimezone: 'UTC'
                                },
                                tokenInfo: {
                                    dailyTokenExpiresAt: new Date((Math.floor(Date.now() / 1000) + 24 * 3600) * 1000).toISOString(),
                                    dailyTokenValidFor: '24 ore de la crearea token-ului',
                                    roomExpiresAt: dailyRoom_1.extendedEndTime.toISOString(),
                                    note: 'Token-ul Daily.co expiră după 24h, camera expiră după timpul programat + 5 min'
                                },
                                recordingInfo: {
                                    layout: 'grid',
                                    cloudRecording: true,
                                    autoStart: true,
                                    note: 'Layout schimbat din active-speaker în grid pentru compatibilitate cu cloud recording'
                                },
                                client: {
                                    id: clientUser_1.id,
                                    name: clientUser_1.name || clientUser_1.email,
                                    email: clientUser_1.email,
                                    role: clientUser_1.role
                                },
                                provider: {
                                    id: provider_1.id,
                                    name: provider_1.user.name || provider_1.user.email,
                                    email: provider_1.user.email
                                },
                                dailyRoom: {
                                    roomName: dailyRoom_1.roomName,
                                    roomUrl: dailyRoom_1.roomUrl,
                                    roomId: dailyRoom_1.roomId,
                                    domainName: dailyRoom_1.domainName,
                                    originalEndTime: dailyRoom_1.originalEndTime.toISOString(),
                                    extendedEndTime: dailyRoom_1.extendedEndTime.toISOString()
                                },
                                calendlyEvent: {
                                    uri: scheduledEventUri_1,
                                    clientName: clientName_1,
                                    clientEmail: clientEmail_1
                                }
                            }
                        })];
                case 15:
                    err_1 = _m.sent();
                    message = err_1 instanceof Error ? err_1.message : String(err_1);
                    console.error('❌ Eroare la salvarea ședinței din Calendly cu pachete și reminder-uri:', message);
                    console.error('Stack trace:', err_1 instanceof Error ? err_1.stack : 'N/A');
                    // 🆕 Returnează erori specifice pentru pachete
                    if (message.includes('Pachetul nu mai are sesiuni') || message.includes('nu aparține')) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                error: 'Package validation failed',
                                message: message,
                                code: 'PACKAGE_ERROR'
                            }, { status: 409 })];
                    }
                    if (message.includes('expirat')) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                error: 'Package expired',
                                message: message,
                                code: 'PACKAGE_EXPIRED'
                            }, { status: 410 })];
                    }
                    // Returnează erori mai specifice bazate pe tipul erorii
                    if (message.includes('Daily.co') || message.includes('DAILY_API_KEY')) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                error: 'Video room creation failed',
                                message: 'Unable to create video room. Please try again later.',
                                code: 'DAILY_ERROR'
                            }, { status: 503 })];
                    }
                    if (message.includes('Calendly') || message.includes('CALENDLY')) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                error: 'Calendly integration error',
                                message: 'Unable to fetch event details from Calendly. Please check provider Calendly configuration.',
                                code: 'CALENDLY_ERROR'
                            }, { status: 502 })];
                    }
                    // 🆕 Gestionare mai bună pentru erorile de reminder-uri și email-uri
                    if (message.includes('reminder') || message.includes('email')) {
                        console.warn('⚠️ Session created successfully but notifications failed:', message);
                        // Nu considerăm asta o eroare fatală - sesiunea a fost creată cu succes
                    }
                    return [2 /*return*/, server_1.NextResponse.json({
                            error: 'Session creation failed',
                            message: 'An unexpected error occurred while creating your session.',
                            code: 'UNKNOWN_ERROR',
                            details: process.env.NODE_ENV === 'development' ? message : undefined
                        }, { status: 500 })];
                case 16: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
