"use strict";
// File: app/api/stripe/connect/callback/route.ts
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
var server_1 = require("next/server");
var stripe_1 = require("stripe");
var prisma_1 = require("@/lib/prisma");
var stripe = new stripe_1["default"](process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-04-30.basil"
});
function GET(req) {
    return __awaiter(this, void 0, void 0, function () {
        var searchParams, code, state, baseUrl, providerId, resp, accountId, url, err_1, url;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    searchParams = new URL(req.url).searchParams;
                    code = searchParams.get("code");
                    state = searchParams.get("state");
                    baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
                    // dacă lipsește code sau state, trimitem pur și simplu înapoi la profil
                    if (!code || !state || !state.startsWith("stripe:")) {
                        return [2 /*return*/, server_1.NextResponse.redirect(new URL("/profil", baseUrl))];
                    }
                    providerId = state.split(":")[1];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, stripe.oauth.token({
                            grant_type: "authorization_code",
                            code: code
                        })];
                case 2:
                    resp = _a.sent();
                    accountId = resp.stripe_user_id;
                    // 2) actualizăm în DB
                    return [4 /*yield*/, prisma_1.prisma.provider.update({
                            where: { id: providerId },
                            data: { stripeAccountId: accountId }
                        })];
                case 3:
                    // 2) actualizăm în DB
                    _a.sent();
                    url = new URL("/profil", baseUrl);
                    url.searchParams.set("stripeConnected", "1"); // poți folosi orice flag
                    return [2 /*return*/, server_1.NextResponse.redirect(url)];
                case 4:
                    err_1 = _a.sent();
                    console.error("Stripe OAuth callback error:", err_1.message);
                    url = new URL("/profil", baseUrl);
                    url.searchParams.set("stripeError", encodeURIComponent(err_1.message));
                    return [2 /*return*/, server_1.NextResponse.redirect(url)];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
