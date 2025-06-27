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
exports.DELETE = exports.POST = void 0;
// app/api/chat/conversation/messages/route.ts
var server_1 = require("next/server");
var client_1 = require("@prisma/client");
var next_auth_1 = require("next-auth");
var auth_1 = require("@/lib/auth");
var redis_1 = require("@/lib/redis");
var userResolver_1 = require("@/utils/userResolver");
var prisma = new client_1.PrismaClient();
// POST - Trimite un mesaj într-o conversație privată
function POST(req) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var session, body, content, fromUsername, toUsername, normalizedFromUsername, normalizedToUsername, normalizedCurrentUser, savedMessage, publisher, conversationId, redisError_1, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 10, , 11]);
                    return [4 /*yield*/, next_auth_1.getServerSession(auth_1.authOptions)];
                case 1:
                    session = _b.sent();
                    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.name)) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })];
                    }
                    return [4 /*yield*/, req.json()];
                case 2:
                    body = _b.sent();
                    content = body.content, fromUsername = body.fromUsername, toUsername = body.toUsername;
                    normalizedFromUsername = userResolver_1.normalizeUserName(fromUsername);
                    normalizedToUsername = userResolver_1.normalizeUserName(toUsername);
                    normalizedCurrentUser = userResolver_1.normalizeUserName(session.user.name);
                    // Verifică că utilizatorul autentificat este cel care trimite mesajul
                    if (normalizedCurrentUser !== normalizedFromUsername) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Unauthorized - cannot send messages as other users' }, { status: 403 })];
                    }
                    // Validare
                    if (!content || !fromUsername || !toUsername) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Content, fromUsername and toUsername are required' }, { status: 400 })];
                    }
                    if (content.length > 500) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Message too long (max 500 characters)' }, { status: 400 })];
                    }
                    if (fromUsername.length > 50 || toUsername.length > 50) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Username too long (max 50 characters)' }, { status: 400 })];
                    }
                    // Verifică că utilizatorul nu încearcă să-și trimită mesaj sieși
                    if (normalizedFromUsername.toLowerCase() === normalizedToUsername.toLowerCase()) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Cannot send message to yourself' }, { status: 400 })];
                    }
                    console.log("Sending message from \"" + normalizedFromUsername + "\" to \"" + normalizedToUsername + "\"");
                    return [4 /*yield*/, prisma.message.create({
                            data: {
                                content: content.trim(),
                                fromUsername: normalizedFromUsername,
                                toUsername: normalizedToUsername,
                                messageType: 'PRIVATE'
                            }
                        })];
                case 3:
                    savedMessage = _b.sent();
                    console.log('Message saved to database:', savedMessage.id);
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 8, , 9]);
                    return [4 /*yield*/, redis_1.initRedisPublisher()];
                case 5:
                    publisher = _b.sent();
                    if (!publisher) return [3 /*break*/, 7];
                    conversationId = userResolver_1.generateConversationId(normalizedFromUsername, normalizedToUsername);
                    return [4 /*yield*/, publisher.publish(redis_1.REDIS_CHANNELS.CHAT_EVENTS, JSON.stringify({
                            type: 'message',
                            message: savedMessage,
                            conversationId: conversationId
                        }))];
                case 6:
                    _b.sent();
                    console.log("Message published to Redis successfully for conversation: " + conversationId);
                    _b.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    redisError_1 = _b.sent();
                    console.warn('Redis publish failed, but message saved to DB:', redisError_1.message);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/, server_1.NextResponse.json({
                        success: true,
                        message: savedMessage
                    })];
                case 10:
                    error_1 = _b.sent();
                    console.error('Error saving conversation message:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Failed to save message' }, { status: 500 })];
                case 11: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
// DELETE - Șterge un mesaj (doar expeditorul poate șterge)
function DELETE(req) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var session, searchParams, messageId, username, normalizedUsername, normalizedCurrentUser, message, publisher, conversationId, redisError_2, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 10, , 11]);
                    return [4 /*yield*/, next_auth_1.getServerSession(auth_1.authOptions)];
                case 1:
                    session = _b.sent();
                    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.name)) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })];
                    }
                    searchParams = new URL(req.url).searchParams;
                    messageId = searchParams.get('id');
                    username = searchParams.get('username');
                    if (!messageId || !username) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Message ID and username are required' }, { status: 400 })];
                    }
                    normalizedUsername = userResolver_1.normalizeUserName(username);
                    normalizedCurrentUser = userResolver_1.normalizeUserName(session.user.name);
                    // Verifică că utilizatorul autentificat este cel care încearcă să șteargă
                    if (normalizedCurrentUser !== normalizedUsername) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Unauthorized - cannot delete other users messages' }, { status: 403 })];
                    }
                    return [4 /*yield*/, prisma.message.findFirst({
                            where: {
                                id: messageId,
                                fromUsername: normalizedUsername,
                                messageType: 'PRIVATE'
                            }
                        })];
                case 2:
                    message = _b.sent();
                    if (!message) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Message not found or not authorized to delete' }, { status: 404 })];
                    }
                    // Șterge mesajul
                    return [4 /*yield*/, prisma.message["delete"]({
                            where: { id: messageId }
                        })];
                case 3:
                    // Șterge mesajul
                    _b.sent();
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 8, , 9]);
                    return [4 /*yield*/, redis_1.initRedisPublisher()];
                case 5:
                    publisher = _b.sent();
                    if (!publisher) return [3 /*break*/, 7];
                    conversationId = userResolver_1.generateConversationId(message.fromUsername, message.toUsername);
                    // Anunță ștergerea prin Redis
                    return [4 /*yield*/, publisher.publish(redis_1.REDIS_CHANNELS.CHAT_EVENTS, JSON.stringify({
                            type: 'messageDeleted',
                            messageId: messageId,
                            conversationId: conversationId
                        }))];
                case 6:
                    // Anunță ștergerea prin Redis
                    _b.sent();
                    console.log("Message deletion published to Redis for conversation: " + conversationId);
                    _b.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    redisError_2 = _b.sent();
                    console.warn('Redis publish failed for message deletion:', redisError_2.message);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/, server_1.NextResponse.json({
                        success: true,
                        message: 'Message deleted successfully'
                    })];
                case 10:
                    error_2 = _b.sent();
                    console.error('Error deleting conversation message:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Failed to delete message' }, { status: 500 })];
                case 11: return [2 /*return*/];
            }
        });
    });
}
exports.DELETE = DELETE;
