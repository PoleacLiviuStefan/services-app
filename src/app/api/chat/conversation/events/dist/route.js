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
var next_auth_1 = require("next-auth");
var auth_1 = require("@/lib/auth");
var redis_1 = require("@/lib/redis");
var userResolver_1 = require("@/utils/userResolver");
exports.runtime = 'nodejs';
// GET - Server-Sent Events pentru conversații
function GET(req) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var session, searchParams, user, conversation_1, normalizedUser_1, normalizedCurrentUser, stream, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, next_auth_1.getServerSession(auth_1.authOptions)];
                case 1:
                    session = _b.sent();
                    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.name)) {
                        return [2 /*return*/, new Response('Unauthorized', { status: 401 })];
                    }
                    searchParams = new URL(req.url).searchParams;
                    user = searchParams.get('user');
                    conversation_1 = searchParams.get('conversation');
                    if (!user || !conversation_1) {
                        return [2 /*return*/, new Response('Missing required parameters', { status: 400 })];
                    }
                    normalizedUser_1 = userResolver_1.normalizeUserName(user);
                    normalizedCurrentUser = userResolver_1.normalizeUserName(session.user.name);
                    // Verifică că utilizatorul autentificat este cel care face cererea
                    if (normalizedCurrentUser !== normalizedUser_1) {
                        return [2 /*return*/, new Response('Forbidden', { status: 403 })];
                    }
                    console.log("[SSE] User " + normalizedUser_1 + " connecting to conversation: " + conversation_1);
                    stream = new ReadableStream({
                        start: function (controller) {
                            var _this = this;
                            var _a;
                            var encoder = new TextEncoder();
                            // Funcție pentru a trimite date
                            var sendEvent = function (data) {
                                try {
                                    var message = "data: " + JSON.stringify(data) + "\n\n";
                                    controller.enqueue(encoder.encode(message));
                                }
                                catch (error) {
                                    console.error('[SSE] Error sending event:', error);
                                }
                            };
                            // Trimite confirmarea de conectare
                            sendEvent({
                                type: 'connected',
                                timestamp: new Date().toISOString(),
                                conversationId: conversation_1
                            });
                            // Inițializează subscriber-ul Redis
                            var subscriber;
                            var heartbeatInterval;
                            var initSubscriber = function () { return __awaiter(_this, void 0, void 0, function () {
                                var error_2;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 5, , 6]);
                                            return [4 /*yield*/, redis_1.initRedisSubscriber()];
                                        case 1:
                                            subscriber = _a.sent();
                                            if (!subscriber) return [3 /*break*/, 3];
                                            return [4 /*yield*/, subscriber.subscribe(redis_1.REDIS_CHANNELS.CHAT_EVENTS)];
                                        case 2:
                                            _a.sent();
                                            console.log("[SSE] Subscribed to Redis events for user " + normalizedUser_1);
                                            subscriber.on('message', function (channel, message) {
                                                try {
                                                    var data = JSON.parse(message);
                                                    // Filtrează mesajele pentru această conversație
                                                    if (data.conversationId && data.conversationId === conversation_1) {
                                                        console.log("[SSE] Relaying message to " + normalizedUser_1 + " in conversation " + conversation_1 + ":", data.type);
                                                        sendEvent(data);
                                                    }
                                                    // Gestionează notificările de online/offline pentru utilizatori din conversație
                                                    if ((data.type === 'userOnline' || data.type === 'userOffline')) {
                                                        // Verifică dacă utilizatorul care se conectează/deconectează face parte din conversația curentă
                                                        var conversationUsers = conversation_1.split('-').map(function (name) { return userResolver_1.normalizeUserName(name); });
                                                        var dataUsername = userResolver_1.normalizeUserName(data.username || '');
                                                        if (conversationUsers.includes(dataUsername)) {
                                                            console.log("[SSE] User " + dataUsername + " status change in conversation " + conversation_1 + ":", data.type);
                                                            sendEvent(data);
                                                        }
                                                    }
                                                }
                                                catch (error) {
                                                    console.error('[SSE] Error parsing Redis message:', error);
                                                }
                                            });
                                            subscriber.on('error', function (error) {
                                                console.error('[SSE] Redis subscriber error:', error);
                                            });
                                            // Heartbeat pentru a menține conexiunea
                                            heartbeatInterval = setInterval(function () {
                                                try {
                                                    sendEvent({
                                                        type: 'heartbeat',
                                                        timestamp: new Date().toISOString()
                                                    });
                                                }
                                                catch (error) {
                                                    console.error('[SSE] Heartbeat error:', error);
                                                    clearInterval(heartbeatInterval);
                                                }
                                            }, 30000); // La fiecare 30 de secunde
                                            return [3 /*break*/, 4];
                                        case 3:
                                            console.warn('[SSE] Redis subscriber not available');
                                            sendEvent({
                                                type: 'error',
                                                message: 'Real-time messaging not available'
                                            });
                                            _a.label = 4;
                                        case 4: return [3 /*break*/, 6];
                                        case 5:
                                            error_2 = _a.sent();
                                            console.error('[SSE] Error initializing subscriber:', error_2);
                                            sendEvent({
                                                type: 'error',
                                                message: 'Failed to connect to real-time service'
                                            });
                                            return [3 /*break*/, 6];
                                        case 6: return [2 /*return*/];
                                    }
                                });
                            }); };
                            // Cleanup când se închide conexiunea
                            var cleanup = function () {
                                console.log("[SSE] Cleaning up connection for user " + normalizedUser_1 + " in conversation " + conversation_1);
                                if (heartbeatInterval) {
                                    clearInterval(heartbeatInterval);
                                }
                                if (subscriber) {
                                    try {
                                        subscriber.unsubscribe();
                                        subscriber.quit();
                                    }
                                    catch (error) {
                                        console.error('[SSE] Error cleaning up subscriber:', error);
                                    }
                                }
                                try {
                                    controller.close();
                                }
                                catch (error) {
                                    console.error('[SSE] Error closing controller:', error);
                                }
                            };
                            // Event listener pentru închiderea conexiunii
                            (_a = req.signal) === null || _a === void 0 ? void 0 : _a.addEventListener('abort', cleanup);
                            // Inițializează subscriber-ul
                            initSubscriber();
                        }
                    });
                    return [2 /*return*/, new Response(stream, {
                            headers: {
                                'Content-Type': 'text/event-stream',
                                'Cache-Control': 'no-cache',
                                'Connection': 'keep-alive',
                                'Access-Control-Allow-Origin': '*',
                                'Access-Control-Allow-Headers': 'Cache-Control'
                            }
                        })];
                case 2:
                    error_1 = _b.sent();
                    console.error('[SSE] Error in events endpoint:', error_1);
                    return [2 /*return*/, new Response('Internal Server Error', { status: 500 })];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
