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
// app/api/chat/conversation/events/route.ts
var server_1 = require("next/server");
var redis_1 = require("@/lib/redis");
var next_auth_1 = require("next-auth");
var auth_1 = require("@/lib/auth");
function GET(req) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var url, conversationId, session, subscriber, stream;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    url = new URL(req.url);
                    conversationId = url.searchParams.get('conversationId');
                    if (!conversationId) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Missing conversationId' }, { status: 400 })];
                    }
                    return [4 /*yield*/, next_auth_1.getServerSession(auth_1.authOptions)];
                case 1:
                    session = _b.sent();
                    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.name)) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })];
                    }
                    return [4 /*yield*/, redis_1.initRedisSubscriber()];
                case 2:
                    subscriber = _b.sent();
                    if (!subscriber) {
                        console.error('[SSE] Redis subscriber unavailable');
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })];
                    }
                    stream = new ReadableStream({
                        start: function (controller) {
                            return __awaiter(this, void 0, void 0, function () {
                                var handler;
                                var _this = this;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            handler = function (raw) {
                                                try {
                                                    var payload = JSON.parse(raw);
                                                    if (payload.conversationId !== conversationId)
                                                        return;
                                                    controller.enqueue("data: " + JSON.stringify(payload) + "\n\n");
                                                }
                                                catch (err) {
                                                    console.error('[SSE] Invalid JSON from Redis:', err);
                                                }
                                            };
                                            // Abonare corectă pentru redis@4.x
                                            return [4 /*yield*/, subscriber.subscribe(redis_1.REDIS_CHANNELS.CHAT_EVENTS, handler)
                                                // Curățare la deconectare client
                                            ];
                                        case 1:
                                            // Abonare corectă pentru redis@4.x
                                            _a.sent();
                                            // Curățare la deconectare client
                                            req.signal.addEventListener('abort', function () { return __awaiter(_this, void 0, void 0, function () {
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0: return [4 /*yield*/, subscriber.unsubscribe(redis_1.REDIS_CHANNELS.CHAT_EVENTS, handler)];
                                                        case 1:
                                                            _a.sent();
                                                            controller.close();
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            }); });
                                            return [2 /*return*/];
                                    }
                                });
                            });
                        }
                    });
                    return [2 /*return*/, new server_1.NextResponse(stream, {
                            status: 200,
                            headers: {
                                'Content-Type': 'text/event-stream',
                                'Cache-Control': 'no-cache, no-transform',
                                Connection: 'keep-alive'
                            }
                        })];
            }
        });
    });
}
exports.GET = GET;
