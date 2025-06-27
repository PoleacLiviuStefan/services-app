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
// app/api/chat/conversations/route.ts
var server_1 = require("next/server");
var client_1 = require("@prisma/client");
var next_auth_1 = require("next-auth");
var auth_1 = require("@/lib/auth");
var prisma = new client_1.PrismaClient();
// GET - Obține toate conversațiile utilizatorului curent
function GET(req) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var session, currentUserName_1, userMessages, conversationsMap_1, participantNames, participants, participantInfoMap_1, conversations, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, next_auth_1.getServerSession(auth_1.authOptions)];
                case 1:
                    session = _b.sent();
                    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.name)) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })];
                    }
                    currentUserName_1 = session.user.name;
                    console.log('Current user:', currentUserName_1);
                    return [4 /*yield*/, prisma.message.findMany({
                            where: {
                                OR: [
                                    { fromUsername: currentUserName_1 },
                                    { toUsername: currentUserName_1 }
                                ],
                                messageType: 'PRIVATE'
                            },
                            orderBy: { createdAt: 'desc' },
                            select: {
                                id: true,
                                content: true,
                                fromUsername: true,
                                toUsername: true,
                                createdAt: true
                            }
                        })];
                case 2:
                    userMessages = _b.sent();
                    conversationsMap_1 = new Map();
                    userMessages.forEach(function (message) {
                        // Determină cine este participantul (nu utilizatorul curent)
                        var participantName = message.fromUsername === currentUserName_1
                            ? message.toUsername
                            : message.fromUsername;
                        if (!participantName)
                            return;
                        var existingConversation = conversationsMap_1.get(participantName);
                        if (!existingConversation) {
                            // Prima dată când vedem această conversație
                            conversationsMap_1.set(participantName, {
                                participantName: participantName,
                                messages: [message],
                                lastMessage: message,
                                messageCount: 1
                            });
                        }
                        else {
                            // Adaugă mesajul la conversația existentă
                            existingConversation.messages.push(message);
                            existingConversation.messageCount++;
                            // Actualizează ultimul mesaj dacă este mai recent
                            if (new Date(message.createdAt) > new Date(existingConversation.lastMessage.createdAt)) {
                                existingConversation.lastMessage = message;
                            }
                        }
                    });
                    participantNames = Array.from(conversationsMap_1.keys());
                    return [4 /*yield*/, prisma.user.findMany({
                            where: {
                                name: {
                                    "in": participantNames
                                }
                            },
                            select: {
                                name: true,
                                email: true,
                                image: true
                            }
                        })];
                case 3:
                    participants = _b.sent();
                    participantInfoMap_1 = new Map(participants.map(function (p) { return [p.name, p]; }));
                    conversations = Array.from(conversationsMap_1.values()).map(function (conv) {
                        var participantInfo = participantInfoMap_1.get(conv.participantName);
                        return {
                            participantName: conv.participantName,
                            participantEmail: participantInfo === null || participantInfo === void 0 ? void 0 : participantInfo.email,
                            participantImage: participantInfo === null || participantInfo === void 0 ? void 0 : participantInfo.image,
                            lastMessage: conv.lastMessage,
                            messageCount: conv.messageCount,
                            // Pentru viitor: calcularea mesajelor necitite
                            unreadCount: 0
                        };
                    });
                    // Sortează conversațiile după ultimul mesaj (cele mai recente primul)
                    conversations.sort(function (a, b) {
                        if (!a.lastMessage || !b.lastMessage)
                            return 0;
                        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
                    });
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            conversations: conversations
                        })];
                case 4:
                    error_1 = _b.sent();
                    console.error('Error fetching conversations:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Failed to fetch conversations' }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
