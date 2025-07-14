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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var react_1 = require("react");
var PackageListItem_1 = require("./PackageListItem");
var SortOrder;
(function (SortOrder) {
    SortOrder["ASC"] = "asc";
    SortOrder["DESC"] = "desc";
})(SortOrder || (SortOrder = {}));
function UserBoughtPackages(_a) {
    var _this = this;
    var isProvider = _a.isProvider;
    // 1. State hooks
    var _b = react_1.useState([]), bought = _b[0], setBought = _b[1];
    var _c = react_1.useState([]), sold = _c[0], setSold = _c[1];
    var _d = react_1.useState(true), loading = _d[0], setLoading = _d[1];
    var _e = react_1.useState(null), error = _e[0], setError = _e[1];
    var _f = react_1.useState(""), searchText = _f[0], setSearchText = _f[1];
    var _g = react_1.useState(""), startDate = _g[0], setStartDate = _g[1];
    var _h = react_1.useState(""), endDate = _h[0], setEndDate = _h[1];
    var _j = react_1.useState(SortOrder.DESC), sortOrder = _j[0], setSortOrder = _j[1];
    var _k = react_1.useState("all"), activeTab = _k[0], setActiveTab = _k[1];
    var _l = react_1.useState(1), currentPage = _l[0], setCurrentPage = _l[1];
    // 2. Fetch data
    react_1.useEffect(function () {
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
            .then(function (_a) {
            var boughtPackages = _a.boughtPackages, soldPackages = _a.soldPackages;
            setBought(boughtPackages || []);
            setSold(soldPackages || []);
            setError(null);
        })["catch"](function (err) {
            console.error("Error fetching packages:", err);
            setError(err.message || "A apărut o eroare");
        })["finally"](function () { return setLoading(false); });
    }, []);
    // 3. Derived data
    var items = react_1.useMemo(function () { return (isProvider ? sold : bought); }, [isProvider, sold, bought]);
    var filteredByTab = react_1.useMemo(function () {
        return items.filter(function (pkg) {
            var _a, _b;
            if (activeTab === 'consumed') {
                return ((_a = pkg.usedSessions) !== null && _a !== void 0 ? _a : 0) >= pkg.providerPackage.totalSessions;
            }
            if (activeTab === 'unconsumed') {
                return ((_b = pkg.usedSessions) !== null && _b !== void 0 ? _b : 0) < pkg.providerPackage.totalSessions;
            }
            return true;
        });
    }, [items, activeTab]);
    var filteredItems = react_1.useMemo(function () {
        return filteredByTab.filter(function (pkg) {
            var name = isProvider
                ? pkg.user.name
                : pkg.provider.user.name;
            if (searchText && !name.toLowerCase().includes(searchText.toLowerCase())) {
                return false;
            }
            var createdISO = new Date(pkg.createdAt).toISOString().slice(0, 10);
            if (startDate && createdISO < startDate)
                return false;
            if (endDate && createdISO > endDate)
                return false;
            return true;
        });
    }, [filteredByTab, searchText, startDate, endDate, isProvider]);
    var sortedItems = react_1.useMemo(function () {
        return __spreadArrays(filteredItems).sort(function (a, b) {
            var ta = new Date(a.createdAt).getTime();
            var tb = new Date(b.createdAt).getTime();
            return sortOrder === SortOrder.ASC ? ta - tb : tb - ta;
        });
    }, [filteredItems, sortOrder]);
    var pageSize = 5;
    var totalPages = Math.ceil(sortedItems.length / pageSize);
    var paginatedItems = react_1.useMemo(function () { return sortedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize); }, [sortedItems, currentPage]);
    // 4. Event handlers
    var resetPage = function () { return setCurrentPage(1); };
    var onSearchChange = function (e) { setSearchText(e.target.value); resetPage(); };
    var onStartDateChange = function (e) { setStartDate(e.target.value); resetPage(); };
    var onEndDateChange = function (e) { setEndDate(e.target.value); resetPage(); };
    var toggleSort = function () { return setSortOrder(function (o) { return o === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC; }); };
    var changeTab = function (tab) { setActiveTab(tab); resetPage(); };
    // 5. Conditional UI
    if (loading)
        return react_1["default"].createElement("p", null, "Se \u00EEncarc\u0103 datele\u2026");
    if (error)
        return react_1["default"].createElement("p", { className: "text-red-500" },
            "Eroare: ",
            error);
    if (!items.length) {
        return (react_1["default"].createElement("p", { className: "text-center text-gray-500" }, isProvider ? "Nicio vânzare încă." : "Nu ai cumpărat niciun pachet."));
    }
    // 6. Render
    return (react_1["default"].createElement("div", { className: "space-y-4 max-w-2xl mx-auto" },
        react_1["default"].createElement("h3", { className: "text-xl font-semibold mb-2" }, isProvider ? "Pachetele vândute" : "Pachetele tale cumpărate"),
        react_1["default"].createElement("div", { className: "flex space-x-2 mb-4" },
            react_1["default"].createElement("button", { onClick: function () { return changeTab('all'); }, className: "px-3 py-1 rounded " + (activeTab === 'all' ? 'bg-primaryColor text-white' : 'bg-gray-200') }, "Toate"),
            react_1["default"].createElement("button", { onClick: function () { return changeTab('unconsumed'); }, className: "px-3 py-1 rounded " + (activeTab === 'unconsumed' ? 'bg-primaryColor text-white' : 'bg-gray-200') }, "Neconsumate"),
            react_1["default"].createElement("button", { onClick: function () { return changeTab('consumed'); }, className: "px-3 py-1 rounded " + (activeTab === 'consumed' ? 'bg-primaryColor text-white' : 'bg-gray-200') }, "Consumate")),
        react_1["default"].createElement("div", { className: "flex flex-wrap gap-3 mb-4" },
            react_1["default"].createElement("input", { type: "text", placeholder: isProvider ? "Caută după nume client..." : "Caută după nume astrolog...", value: searchText, onChange: onSearchChange, className: "flex-1 border p-2 rounded" }),
            react_1["default"].createElement("input", { type: "date", value: startDate, onChange: onStartDateChange, className: "border p-2 rounded" }),
            react_1["default"].createElement("input", { type: "date", value: endDate, onChange: onEndDateChange, className: "border p-2 rounded" }),
            react_1["default"].createElement("button", { onClick: toggleSort, className: "px-3 py-1 border rounded" },
                "Sortare: ",
                sortOrder.toUpperCase())),
        react_1["default"].createElement("ul", { className: "space-y-4" }, paginatedItems.map(function (pkg) { return (react_1["default"].createElement(PackageListItem_1["default"], { key: pkg.id, pkg: pkg, isProvider: isProvider })); })),
        react_1["default"].createElement("div", { className: "flex justify-center items-center space-x-4 mt-4" },
            react_1["default"].createElement("button", { onClick: function () { return setCurrentPage(function (p) { return Math.max(1, p - 1); }); }, disabled: currentPage === 1, className: "px-3 py-1 bg-gray-200 rounded disabled:opacity-50" }, "Anterior"),
            react_1["default"].createElement("span", null,
                "Pagina ",
                currentPage,
                " din ",
                totalPages),
            react_1["default"].createElement("button", { onClick: function () { return setCurrentPage(function (p) { return Math.min(totalPages, p + 1); }); }, disabled: currentPage === totalPages, className: "px-3 py-1 bg-gray-200 rounded disabled:opacity-50" }, "Urm\u0103tor"))));
}
exports["default"] = UserBoughtPackages;
