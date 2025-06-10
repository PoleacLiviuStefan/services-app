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
exports.authOptions = void 0;
var google_1 = require("next-auth/providers/google");
var credentials_1 = require("next-auth/providers/credentials");
var prisma_adapter_1 = require("@next-auth/prisma-adapter");
var prisma_1 = require("@/lib/prisma");
var bcrypt_1 = require("bcrypt");
exports.authOptions = {
    adapter: prisma_adapter_1.PrismaAdapter(prisma_1.prisma),
    providers: [
        google_1["default"]({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // Folosim doar PKCE, nu state, ca să evităm mismatch-ul
            checks: ["pkce"]
        }),
        credentials_1["default"]({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "john.doe@example.com" },
                password: { label: "Password", type: "password" }
            },
            authorize: function (credentials) {
                var _a, _b, _c, _d;
                return __awaiter(this, void 0, void 0, function () {
                    var user, isPasswordValid;
                    return __generator(this, function (_e) {
                        switch (_e.label) {
                            case 0:
                                if (!(credentials === null || credentials === void 0 ? void 0 : credentials.email) || !(credentials === null || credentials === void 0 ? void 0 : credentials.password)) {
                                    throw new Error("Toate câmpurile sunt obligatorii.");
                                }
                                return [4 /*yield*/, prisma_1.prisma.user.findUnique({
                                        where: { email: credentials.email }
                                    })];
                            case 1:
                                user = _e.sent();
                                if (!user || !user.password) {
                                    throw new Error("Email sau parolă incorecte.");
                                }
                                return [4 /*yield*/, bcrypt_1["default"].compare(credentials.password, user.password)];
                            case 2:
                                isPasswordValid = _e.sent();
                                if (!isPasswordValid) {
                                    throw new Error("Email sau parolă incorecte.");
                                }
                                return [2 /*return*/, {
                                        id: user.id,
                                        name: (_a = user.name) !== null && _a !== void 0 ? _a : "Utilizator",
                                        email: user.email,
                                        image: (_b = user.image) !== null && _b !== void 0 ? _b : null,
                                        role: (_c = user.role) !== null && _c !== void 0 ? _c : "STANDARD",
                                        gender: (_d = user.gender) !== null && _d !== void 0 ? _d : "N/A"
                                    }];
                        }
                    });
                });
            }
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: "jwt"
    },
    pages: {
        signIn: "/autentificare"
    },
    // ===== COOKIE & CSRF CONFIG =====
    useSecureCookies: process.env.NODE_ENV === "production",
    cookies: {
        // token-ul pentru state (anti-CSRF)
        stateToken: {
            name: "next-auth.state-token",
            options: {
                httpOnly: true,
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                secure: process.env.NODE_ENV === "production",
                path: "/"
            }
        },
        // token-ul CSRF
        csrfToken: {
            name: "next-auth.csrf-token",
            options: {
                httpOnly: true,
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                secure: process.env.NODE_ENV === "production",
                path: "/"
            }
        },
        // callback URL (client-readable)
        callbackUrl: {
            name: "next-auth.callback-url",
            options: {
                httpOnly: false,
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                secure: process.env.NODE_ENV === "production",
                path: "/"
            }
        },
        // PKCE code_verifier
        pkceCodeVerifier: {
            name: "next-auth.pkce.code_verifier",
            options: {
                httpOnly: true,
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                secure: process.env.NODE_ENV === "production",
                path: "/"
            }
        }
    },
    callbacks: {
        jwt: function (_a) {
            var token = _a.token, user = _a.user;
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_b) {
                    if (user) {
                        token.sub = user.id;
                        token.role = user.role;
                        token.gender = user.gender;
                    }
                    return [2 /*return*/, token];
                });
            });
        },
        session: function (_a) {
            var session = _a.session, token = _a.token;
            return __awaiter(this, void 0, void 0, function () {
                var dbUser;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!token.sub) return [3 /*break*/, 2];
                            return [4 /*yield*/, prisma_1.prisma.user.findUnique({
                                    where: { id: token.sub },
                                    select: {
                                        name: true,
                                        email: true,
                                        image: true,
                                        role: true,
                                        gender: true
                                    }
                                })];
                        case 1:
                            dbUser = _b.sent();
                            if (dbUser) {
                                session.user.id = token.sub;
                                session.user.name = dbUser.name;
                                session.user.email = dbUser.email;
                                session.user.image = dbUser.image;
                                session.user.role = dbUser.role;
                                session.user.gender = dbUser.gender;
                            }
                            _b.label = 2;
                        case 2: return [2 /*return*/, session];
                    }
                });
            });
        }
    }
};
