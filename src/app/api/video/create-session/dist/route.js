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
exports.runtime = 'nodejs';
var server_1 = require("next/server");
var prisma_1 = require("@/lib/prisma");
var jsrsasign_1 = require("jsrsasign"); // npm install jsrsasign @types/jsrsasign
var uuid_1 = require("uuid");
// ✅ Generare JWT pentru API requests (server-to-server)
function generateZoomApiToken() {
    var iat = Math.round(new Date().getTime() / 1000) - 30;
    var exp = iat + 60 * 60 * 2; // 2 ore
    var oHeader = { alg: 'HS256', typ: 'JWT' };
    var oPayload = {
        iss: process.env.ZOOM_API_PUBLIC,
        iat: iat,
        exp: exp
    };
    var sHeader = JSON.stringify(oHeader);
    var sPayload = JSON.stringify(oPayload);
    return jsrsasign_1["default"].jws.JWS.sign('HS256', sHeader, sPayload, process.env.ZOOM_API_SECRET);
}
// ✅ Generare JWT COMPLET pentru client authentication
function generateClientToken(sessionName, userId, roleType) {
    var _a;
    if (roleType === void 0) { roleType = 0; }
    var iat = Math.round(new Date().getTime() / 1000) - 30;
    var exp = iat + 60 * 60 * 2; // 2 ore
    // Header oficial
    var oHeader = {
        alg: 'HS256',
        typ: 'JWT'
    };
    // ✅ Payload COMPLET cu toate câmpurile obligatorii
    var oPayload = {
        iss: process.env.ZOOM_API_PUBLIC,
        exp: exp,
        iat: iat,
        aud: 'zoom',
        appKey: process.env.ZOOM_API_PUBLIC,
        tokenExp: exp,
        tpc: sessionName,
        role_type: roleType,
        user_identity: userId,
        session_key: '',
        // Câmpuri suplimentare pentru compatibilitate
        version: 1,
        geo_regions: 'US'
    };
    console.log('[Debug] Complete JWT payload generation:', {
        method: 'jsrsasign',
        apiKey: ((_a = process.env.ZOOM_API_PUBLIC) === null || _a === void 0 ? void 0 : _a.substring(0, 10)) + '...',
        timing: {
            iat: new Date(iat * 1000).toISOString(),
            exp: new Date(exp * 1000).toISOString(),
            tokenExp: new Date(oPayload.tokenExp * 1000).toISOString(),
            durationMinutes: (exp - iat) / 60
        },
        sessionName: sessionName,
        userId: userId,
        roleType: roleType,
        payloadKeys: Object.keys(oPayload)
    });
    try {
        var sHeader = JSON.stringify(oHeader);
        var sPayload = JSON.stringify(oPayload);
        // Generare JWT cu metoda oficială
        var token = jsrsasign_1["default"].jws.JWS.sign('HS256', sHeader, sPayload, process.env.ZOOM_API_SECRET);
        console.log('[Debug] Complete token generated successfully');
        // Debug token structure
        try {
            var decodedPayload = JSON.parse(atob(token.split('.')[1]));
            console.log('[Debug] Generated token verification:', {
                hasIat: !!decodedPayload.iat,
                hasAud: !!decodedPayload.aud,
                hasAppKey: !!decodedPayload.appKey,
                hasTokenExp: !!decodedPayload.tokenExp,
                roleType: decodedPayload.role_type,
                allFields: Object.keys(decodedPayload)
            });
        }
        catch (e) {
            console.warn('[Debug] Could not verify generated token structure');
        }
        return token;
    }
    catch (error) {
        console.error('[Debug] Complete token generation failed:', error);
        throw new Error('Failed to generate complete token');
    }
}
// ✅ Creează sesiune prin API-ul Zoom
function createZoomSession(sessionName) {
    return __awaiter(this, void 0, Promise, function () {
        var apiToken, response, errorData, sessionData, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    apiToken = generateZoomApiToken();
                    console.log('[Debug] Creating Zoom session via API:', {
                        sessionName: sessionName,
                        apiEndpoint: 'https://api.zoom.us/v2/videosdk/sessions'
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, fetch('https://api.zoom.us/v2/videosdk/sessions', {
                            method: 'POST',
                            headers: {
                                'Authorization': "Bearer " + apiToken,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                session_name: sessionName
                            })
                        })];
                case 2:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.json()["catch"](function () { return ({}); })];
                case 3:
                    errorData = _a.sent();
                    console.error('[Debug] Zoom API error:', {
                        status: response.status,
                        statusText: response.statusText,
                        error: errorData
                    });
                    throw new Error("Zoom API error: " + response.status + " " + response.statusText);
                case 4: return [4 /*yield*/, response.json()];
                case 5:
                    sessionData = _a.sent();
                    console.log('[Debug] Zoom session created successfully:', {
                        sessionId: sessionData.session_id,
                        sessionNumber: sessionData.session_number,
                        sessionName: sessionData.session_name
                    });
                    return [2 /*return*/, sessionData];
                case 6:
                    error_1 = _a.sent();
                    console.error('[Debug] Failed to create Zoom session:', error_1);
                    throw error_1;
                case 7: return [2 /*return*/];
            }
        });
    });
}
function POST(req) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, users, providerId, clientId, specialityId, packageId, sessionName, zoomSession, tokens, _i, users_1, userId, roleType, consultingSession, response, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('[Debug] ========== Creating new consulting session with complete JWT ==========');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, req.json()];
                case 2:
                    _a = _b.sent(), users = _a.users, providerId = _a.providerId, clientId = _a.clientId, specialityId = _a.specialityId, packageId = _a.packageId;
                    // Validări de bază
                    if (!Array.isArray(users) || users.length !== 2) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Trebuie să specifici exact 2 user IDs.' }, { status: 400 })];
                    }
                    if (!providerId || !clientId || !specialityId) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Lipsește providerId, clientId sau specialityId.' }, { status: 400 })];
                    }
                    // Verifică credentialele Zoom
                    if (!process.env.ZOOM_API_PUBLIC || !process.env.ZOOM_API_SECRET) {
                        console.error('[Debug] Missing Zoom API credentials');
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Zoom API configuration missing' }, { status: 500 })];
                    }
                    console.log('[Debug] Session creation parameters:', {
                        users: users,
                        providerId: providerId,
                        clientId: clientId,
                        specialityId: specialityId,
                        packageId: packageId
                    });
                    sessionName = "session-" + uuid_1.v4();
                    console.log('[Debug] Creating Zoom session with name:', sessionName);
                    return [4 /*yield*/, createZoomSession(sessionName)];
                case 3:
                    zoomSession = _b.sent();
                    tokens = {};
                    for (_i = 0, users_1 = users; _i < users_1.length; _i++) {
                        userId = users_1[_i];
                        roleType = (userId === providerId) ? 1 : 0;
                        console.log('[Debug] Generating complete token for user:', {
                            userId: userId,
                            roleType: roleType,
                            isProvider: userId === providerId,
                            sessionName: zoomSession.session_name
                        });
                        tokens[userId] = generateClientToken(zoomSession.session_name, userId, roleType);
                    }
                    return [4 /*yield*/, prisma_1.prisma.consultingSession.create({
                            data: {
                                providerId: providerId,
                                clientId: clientId,
                                specialityId: specialityId,
                                packageId: packageId,
                                zoomSessionName: zoomSession.session_name,
                                zoomSessionId: zoomSession.session_id,
                                zoomTokens: tokens,
                                zoomCreatedAt: new Date(zoomSession.created_at),
                                // Adaugă alte câmpuri dacă sunt necesare
                                startDate: new Date(),
                                endDate: new Date(Date.now() + 60 * 60 * 1000)
                            }
                        })];
                case 4:
                    consultingSession = _b.sent();
                    console.log('[Debug] Consulting session created in database:', {
                        sessionId: consultingSession.id,
                        zoomSessionName: consultingSession.zoomSessionName,
                        zoomSessionId: consultingSession.zoomSessionId,
                        tokensGenerated: Object.keys(tokens).length
                    });
                    response = {
                        // Informații pentru client
                        sessionId: consultingSession.id,
                        sessionName: zoomSession.session_name,
                        tokens: tokens,
                        // Informații suplimentare
                        zoomSessionId: zoomSession.session_id,
                        zoomSessionNumber: zoomSession.session_number,
                        createdAt: zoomSession.created_at,
                        // Debugging info
                        debug: process.env.NODE_ENV === 'development' ? {
                            apiUsed: 'https://api.zoom.us/v2/videosdk/sessions',
                            method: 'official_zoom_jsrsasign_complete_payload',
                            credentialsUsed: 'ZOOM_API_PUBLIC/SECRET',
                            tokensWithCompletePayload: true
                        } : undefined
                    };
                    console.log('[Debug] ========== Session creation completed successfully ==========');
                    return [2 /*return*/, server_1.NextResponse.json(response, { status: 200 })];
                case 5:
                    error_2 = _b.sent();
                    console.error('[Debug] Session creation failed:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({
                            error: 'Failed to create session',
                            details: process.env.NODE_ENV === 'development' ? error_2.message : undefined
                        }, { status: 500 })];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
