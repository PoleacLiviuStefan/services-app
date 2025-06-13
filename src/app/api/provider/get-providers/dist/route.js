"use strict";
// src/app/api/provider/get-providers/route.ts
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
exports.__esModule = true;
exports.GET = void 0;
var server_1 = require("next/server");
var prisma_1 = require("@/lib/prisma");
var util_1 = require("@/utils/util");
function GET(req) {
    return __awaiter(this, void 0, void 0, function () {
        var qs_1, specialityParam, toolParam, readingParam, serviceParam, search, nameParam, limitParam, take, parsed, raw, count, avg, averageRating, reviews, provider, whereClause, findManyOptions, rawList, providers, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    qs_1 = req.nextUrl.searchParams;
                    specialityParam = qs_1.get('speciality');
                    toolParam = qs_1.get('tool');
                    readingParam = qs_1.get('reading');
                    serviceParam = qs_1.get('service');
                    search = qs_1.get('search') || '';
                    nameParam = qs_1.get('name');
                    limitParam = qs_1.get('limit');
                    take = undefined;
                    if (limitParam) {
                        parsed = parseInt(limitParam, 10);
                        if (!isNaN(parsed) && parsed > 0) {
                            take = parsed;
                        }
                    }
                    if (!nameParam) return [3 /*break*/, 2];
                    return [4 /*yield*/, prisma_1.prisma.provider.findFirst({
                            where: { user: { name: nameParam } },
                            include: {
                                user: true,
                                reading: { select: { id: true, name: true, description: true } },
                                specialities: true,
                                tools: true,
                                mainSpeciality: { select: { id: true, name: true } },
                                mainTool: { select: { id: true, name: true } },
                                reviews: { select: { rating: true } },
                                providerPackages: {
                                    select: {
                                        id: true,
                                        service: true,
                                        totalSessions: true,
                                        price: true,
                                        expiresAt: true
                                    }
                                }
                            }
                        })];
                case 1:
                    raw = _a.sent();
                    if (!raw) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Provider not found.' }, { status: 404 })];
                    }
                    count = raw.reviews.length;
                    avg = count > 0
                        ? raw.reviews.reduce(function (sum, r) { return sum + r.rating; }, 0) / count
                        : 0;
                    averageRating = parseFloat(avg.toFixed(2));
                    reviews = raw.reviews, provider = __rest(raw, ["reviews"]);
                    return [2 /*return*/, server_1.NextResponse.json({
                            provider: __assign(__assign({}, provider), { reviewsCount: count, averageRating: averageRating })
                        }, { status: 200 })];
                case 2:
                    whereClause = {
                        AND: [
                            search
                                ? { user: { name: { contains: search, mode: 'insensitive' } } }
                                : {},
                            specialityParam
                                ? {
                                    specialities: {
                                        some: { name: { contains: specialityParam, mode: 'insensitive' } }
                                    }
                                }
                                : {},
                            toolParam
                                ? {
                                    tools: {
                                        some: { name: { contains: toolParam, mode: 'insensitive' } }
                                    }
                                }
                                : {},
                            readingParam
                                ? { reading: { name: { contains: readingParam, mode: 'insensitive' } } }
                                : {},
                            serviceParam
                                ? { providerPackages: { some: { service: serviceParam } } }
                                : {}
                        ]
                    };
                    findManyOptions = {
                        where: whereClause,
                        include: {
                            user: true,
                            reading: { select: { id: true, name: true, description: true } },
                            specialities: true,
                            tools: true,
                            mainSpeciality: { select: { id: true, name: true } },
                            mainTool: { select: { id: true, name: true } },
                            reviews: { select: { rating: true } },
                            providerPackages: {
                                select: {
                                    id: true,
                                    service: true,
                                    totalSessions: true,
                                    price: true,
                                    expiresAt: true
                                }
                            }
                        }
                    };
                    // Dacă 'take' a fost setat (limit), îl adăugăm la opțiuni
                    if (take !== undefined) {
                        findManyOptions.take = take;
                    }
                    return [4 /*yield*/, prisma_1.prisma.provider.findMany(findManyOptions)];
                case 3:
                    rawList = _a.sent();
                    providers = rawList.map(function (raw) {
                        var count = raw.reviews.length;
                        var avg = count > 0
                            ? raw.reviews.reduce(function (sum, r) { return sum + r.rating; }, 0) / count
                            : 0;
                        var averageRating = parseFloat(avg.toFixed(2));
                        var reviews = raw.reviews, provider = __rest(raw, ["reviews"]);
                        return __assign(__assign({}, provider), { reviewsCount: count, averageRating: averageRating });
                    });
                    return [2 /*return*/, server_1.NextResponse.json({ providers: providers }, { status: 200 })];
                case 4:
                    error_1 = _a.sent();
                    console.error('Eroare la obținerea providerilor:', util_1.isError(error_1) ? error_1.message : error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: 'A apărut o eroare la obținerea providerilor.' }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
