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
// app/api/chat/conversation/route.ts
var server_1 = require("next/server");
var client_1 = require("@prisma/client");
var next_auth_1 = require("next-auth");
var auth_1 = require("@/lib/auth");
var userResolver_1 = require("@/utils/userResolver");
var prisma = new client_1.PrismaClient();
// GET - Recuperează mesajele pentru o conversație specifică
function GET(req) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var session, searchParams, user1, user2, limit, offset, currentUserName, messages, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, next_auth_1.getServerSession(auth_1.authOptions)];
                case 1:
                    session = _b.sent();
                    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.name)) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })];
                    }
                    searchParams = new URL(req.url).searchParams;
                    user1 = searchParams.get('user1');
                    user2 = searchParams.get('user2');
                    limit = parseInt(searchParams.get('limit') || '50');
                    offset = parseInt(searchParams.get('offset') || '0');
                    if (!user1 || !user2) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Both user1 and user2 are required' }, { status: 400 })];
                    }
                    // Normalizează numele pentru a evita problemele cu encoding
                    user1 = userResolver_1.normalizeUserName(user1);
                    user2 = userResolver_1.normalizeUserName(user2);
                    currentUserName = userResolver_1.normalizeUserName(session.user.name);
                    if (currentUserName !== user1 && currentUserName !== user2) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Unauthorized - can only access your own conversations' }, { status: 403 })];
                    }
                    // Verifică să nu încerce să converseze cu sine
                    if (user1.toLowerCase() === user2.toLowerCase()) {
                        return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Cannot have conversation with yourself' }, { status: 400 })];
                    }
                    console.log("Loading conversation between: \"" + user1 + "\" and \"" + user2 + "\"");
                    return [4 /*yield*/, prisma.message.findMany({
                            where: {
                                messageType: 'PRIVATE',
                                OR: [
                                    {
                                        AND: [
                                            { fromUsername: user1 },
                                            { toUsername: user2 }
                                        ]
                                    },
                                    {
                                        AND: [
                                            { fromUsername: user2 },
                                            { toUsername: user1 }
                                        ]
                                    }
                                ]
                            },
                            orderBy: { createdAt: 'asc' },
                            take: limit,
                            skip: offset
                        })];
                case 2:
                    messages = _b.sent();
                    console.log("Found " + messages.length + " messages for conversation");
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: true,
                            messages: messages,
                            conversationId: [user1, user2].sort().join('-'),
                            count: messages.length
                        })];
                case 3:
                    error_1 = _b.sent();
                    console.error('Error fetching conversation messages:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 })];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
