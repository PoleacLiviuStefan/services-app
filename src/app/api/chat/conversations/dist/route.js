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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.POST = exports.GET = void 0;
// app/api/chat/conversations/route.ts - ACTUALIZAT pentru slug-uri
var server_1 = require("next/server");
var client_1 = require("@prisma/client");
var next_auth_1 = require("next-auth");
var auth_1 = require("@/lib/auth");
var prisma = new client_1.PrismaClient();
// GET - Obține toate conversațiile utilizatorului curent
function GET(req) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var session, currentUserName_1, currentUser, currentUserSlug_1, userMessages, conversationsMap_1, participantSlugs, participantNames, participants, participantBySlugMap_1, participantByNameMap_1, conversations, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 5, 6, 8]);
                    return [4 /*yield*/, next_auth_1.getServerSession(auth_1.authOptions)];
                case 1:
                    session = _b.sent();
                    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.name)) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })];
                    }
                    currentUserName_1 = session.user.name;
                    return [4 /*yield*/, prisma.user.findUnique({
                            where: { name: currentUserName_1 },
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                image: true
                            }
                        })];
                case 2:
                    currentUser = _b.sent();
                    if (!currentUser) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'User not found in database' }, { status: 404 })];
                    }
                    currentUserSlug_1 = session.user.slug;
                    console.log('Current user slug:', currentUserSlug_1);
                    return [4 /*yield*/, prisma.message.findMany({
                            where: {
                                OR: __spreadArrays((currentUserSlug_1 ? [
                                    { fromUserSlug: currentUserSlug_1 },
                                    { toUserSlug: currentUserSlug_1 }
                                ] : [])),
                                messageType: 'PRIVATE'
                            },
                            orderBy: { createdAt: 'desc' },
                            select: {
                                id: true,
                                content: true,
                                // 🆕 Includem atât slug-urile cât și numele
                                fromUserSlug: true,
                                toUserSlug: true,
                                fromUsername: true,
                                toUsername: true,
                                createdAt: true
                            }
                        })];
                case 3:
                    userMessages = _b.sent();
                    console.log("\uD83D\uDCCA G\u0103site " + userMessages.length + " mesaje pentru utilizatorul curent");
                    conversationsMap_1 = new Map();
                    userMessages.forEach(function (message) {
                        var participantSlug = null;
                        var participantName = null;
                        // 🆕 Determină participantul folosind slug-uri (preferabil) sau nume (fallback)
                        if (message.fromUserSlug === currentUserSlug_1 || message.fromUsername === currentUserName_1) {
                            // Mesajul e trimis de utilizatorul curent → participantul e destinatarul
                            participantSlug = message.toUserSlug;
                            participantName = message.toUsername;
                        }
                        else {
                            // Mesajul e primit de utilizatorul curent → participantul e expeditorul
                            participantSlug = message.fromUserSlug;
                            participantName = message.fromUsername;
                        }
                        // Folosim slug-ul ca cheie principală, dar fallback la nume dacă nu există slug
                        var conversationKey = participantSlug || participantName;
                        if (!conversationKey)
                            return; // Skip mesajele fără identificator valid
                        var existingConversation = conversationsMap_1.get(conversationKey);
                        if (!existingConversation) {
                            // Prima dată când vedem această conversație
                            conversationsMap_1.set(conversationKey, {
                                participantSlug: participantSlug,
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
                            // 🆕 Actualizează informațiile despre participant dacă mesajul nou are slug și cel vechi nu
                            if (!existingConversation.participantSlug && participantSlug) {
                                existingConversation.participantSlug = participantSlug;
                            }
                            if (!existingConversation.participantName && participantName) {
                                existingConversation.participantName = participantName;
                            }
                        }
                    });
                    participantSlugs = Array.from(conversationsMap_1.values())
                        .map(function (conv) { return conv.participantSlug; })
                        .filter(Boolean);
                    participantNames = Array.from(conversationsMap_1.values())
                        .map(function (conv) { return conv.participantName; })
                        .filter(Boolean);
                    return [4 /*yield*/, prisma.user.findMany({
                            where: {
                                OR: __spreadArrays((participantSlugs.length > 0 ? [{ slug: { "in": participantSlugs } }] : []), (participantNames.length > 0 ? [{ name: { "in": participantNames } }] : []))
                            },
                            select: {
                                name: true,
                                slug: true,
                                email: true,
                                image: true
                            }
                        })];
                case 4:
                    participants = _b.sent();
                    console.log("\uD83D\uDC65 G\u0103si\u021Bi " + participants.length + " participan\u021Bi \u00EEn conversa\u021Bii");
                    participantBySlugMap_1 = new Map(participants.filter(function (p) { return p.slug; }).map(function (p) { return [p.slug, p]; }));
                    participantByNameMap_1 = new Map(participants.filter(function (p) { return p.name; }).map(function (p) { return [p.name, p]; }));
                    conversations = Array.from(conversationsMap_1.values()).map(function (conv) {
                        // Încearcă să găsești participantul după slug, apoi după nume
                        var participantInfo = null;
                        if (conv.participantSlug) {
                            participantInfo = participantBySlugMap_1.get(conv.participantSlug);
                        }
                        if (!participantInfo && conv.participantName) {
                            participantInfo = participantByNameMap_1.get(conv.participantName);
                        }
                        return {
                            // 🆕 Informații despre participant (cu slug în plus)
                            participantSlug: (participantInfo === null || participantInfo === void 0 ? void 0 : participantInfo.slug) || conv.participantSlug,
                            participantName: (participantInfo === null || participantInfo === void 0 ? void 0 : participantInfo.name) || conv.participantName,
                            participantEmail: participantInfo === null || participantInfo === void 0 ? void 0 : participantInfo.email,
                            participantImage: participantInfo === null || participantInfo === void 0 ? void 0 : participantInfo.image,
                            // Informații despre conversație
                            lastMessage: conv.lastMessage,
                            messageCount: conv.messageCount,
                            unreadCount: 0,
                            // 🆕 Metadate pentru debugging
                            hasSlug: Boolean(participantInfo === null || participantInfo === void 0 ? void 0 : participantInfo.slug),
                            conversationKey: conv.participantSlug || conv.participantName
                        };
                    });
                    // Sortează conversațiile după ultimul mesaj (cele mai recente primul)
                    conversations.sort(function (a, b) {
                        if (!a.lastMessage || !b.lastMessage)
                            return 0;
                        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
                    });
                    console.log("\u2705 Returnez " + conversations.length + " conversa\u021Bii");
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            conversations: conversations,
                            // 🆕 Informații suplimentare pentru debugging
                            meta: {
                                currentUser: {
                                    name: currentUser.name,
                                    slug: currentUser.slug
                                },
                                totalMessages: userMessages.length,
                                participantsFound: participants.length
                            }
                        })];
                case 5:
                    error_1 = _b.sent();
                    console.error('💥 Error fetching conversations:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Failed to fetch conversations' }, { status: 500 })];
                case 6: return [4 /*yield*/, prisma.$disconnect()];
                case 7:
                    _b.sent();
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
// 🆕 POST - Marchează o conversație ca citită (pentru viitor)
function POST(req) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var session, _b, participantSlug, participantName, error_2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 3, 4, 6]);
                    return [4 /*yield*/, next_auth_1.getServerSession(auth_1.authOptions)];
                case 1:
                    session = _c.sent();
                    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.name)) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })];
                    }
                    return [4 /*yield*/, req.json()];
                case 2:
                    _b = _c.sent(), participantSlug = _b.participantSlug, participantName = _b.participantName;
                    if (!participantSlug && !participantName) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Participant identifier required' }, { status: 400 })];
                    }
                    // TODO: Implementează logica pentru marcarea mesajelor ca citite
                    // Deocamdată returnăm success
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            message: 'Conversation marked as read'
                        })];
                case 3:
                    error_2 = _c.sent();
                    console.error('💥 Error marking conversation as read:', error_2);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Failed to mark conversation as read' }, { status: 500 })];
                case 4: return [4 /*yield*/, prisma.$disconnect()];
                case 5:
                    _c.sent();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
