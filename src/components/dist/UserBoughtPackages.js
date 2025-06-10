// File: components/UserBoughtPackages.tsx
"use client";
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
var react_1 = require("react");
var react_2 = require("next-auth/react");
var link_1 = require("next/link");
function UserBoughtPackages() {
    var _this = this;
    var _a = react_2.useSession(), session = _a.data, status = _a.status;
    var _b = react_1.useState([]), packages = _b[0], setPackages = _b[1];
    var _c = react_1.useState(true), loading = _c[0], setLoading = _c[1];
    var _d = react_1.useState(null), error = _d[0], setError = _d[1];
    react_1.useEffect(function () {
        if (status !== "authenticated") {
            setLoading(false);
            return;
        }
        setLoading(true);
        fetch("/api/user/bought-packages", { credentials: "include" })
            .then(function (res) { return __awaiter(_this, void 0, void 0, function () {
            var json;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!res.ok) return [3 /*break*/, 2];
                        return [4 /*yield*/, res.json()["catch"](function () { return null; })];
                    case 1:
                        json = _a.sent();
                        throw new Error((json === null || json === void 0 ? void 0 : json.error) || "Status " + res.status);
                    case 2: return [2 /*return*/, res.json()];
                }
            });
        }); })
            .then(function (json) {
            setPackages(json.packages);
            setError(null);
        })["catch"](function (err) {
            console.error("Error fetching bought packages:", err);
            setError(err.message || "A apărut o eroare");
        })["finally"](function () {
            setLoading(false);
        });
    }, [status]);
    // if (status === "loading" || loading) {
    //   return <p>Se încarcă pachetele cumpărate…</p>;
    // }
    if (error) {
        return react_1["default"].createElement("p", { className: "text-red-500" },
            "Eroare: ",
            error);
    }
    if (!packages.length) {
        return react_1["default"].createElement("p", null, "Nu ai cump\u0103rat \u00EEnc\u0103 niciun pachet.");
    }
    return (react_1["default"].createElement("div", { className: "space-y-4 max-w-2xl mx-auto" },
        react_1["default"].createElement("h3", { className: "text-xl font-semibold mb-2" }, "Pachetele tale cump\u0103rate"),
        react_1["default"].createElement("ul", { className: "space-y-4" }, packages.map(function (pkg) { return (react_1["default"].createElement("li", { key: pkg.id, className: "border rounded-lg p-4 shadow-sm hover:shadow-md transition" },
            react_1["default"].createElement("div", { className: "flex justify-between" },
                react_1["default"].createElement("div", null,
                    react_1["default"].createElement("p", { className: "flex flex-col text-lg font-medium" },
                        "Pachet de la:",
                        " ",
                        react_1["default"].createElement(link_1["default"], { href: "/profile/" + pkg.provider.user.name, className: "font-semibold" }, pkg.provider.user.name)),
                    react_1["default"].createElement("p", { className: "text-sm text-gray-600" },
                        "Tip serviciu: ",
                        pkg.providerPackage.service),
                    react_1["default"].createElement("p", { className: "text-sm text-gray-600" },
                        "Pre\u021B: ",
                        pkg.providerPackage.price.toFixed(2),
                        " RON"),
                    react_1["default"].createElement("p", { className: "text-sm text-gray-600" },
                        "\u0218edin\u021Be incluse: ",
                        pkg.providerPackage.totalSessions,
                        " ( ai folosit ",
                        pkg.usedSessions,
                        ")")),
                react_1["default"].createElement("div", { className: "text-right text-sm" },
                    react_1["default"].createElement("p", null, "Achizi\u021Bionat la:"),
                    react_1["default"].createElement("p", null, new Date(pkg.createdAt).toLocaleDateString("ro-RO", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                    })),
                    pkg.expiresAt && (react_1["default"].createElement(react_1["default"].Fragment, null,
                        react_1["default"].createElement("p", null, "Expir\u0103 la:"),
                        react_1["default"].createElement("p", null, new Date(pkg.expiresAt).toLocaleDateString("ro-RO", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric"
                        })))))))); }))));
}
exports["default"] = UserBoughtPackages;
