"use client";
"use strict";
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
exports.__esModule = true;
var react_1 = require("react");
var providerCard_1 = require("./providerCard");
var EntityRequestApproval_1 = require("@/components/EntityRequestApproval");
var fa_1 = require("react-icons/fa");
var AdminPsychics = function (_a) {
    var physics = _a.physics;
    var _b = react_1.useState('users'), tab = _b[0], setTab = _b[1];
    var _c = react_1.useState('PENDING'), statusTab = _c[0], setStatusTab = _c[1];
    var _d = react_1.useState('SPECIALITY'), typeTab = _d[0], setTypeTab = _d[1];
    var _e = react_1.useState(''), searchTerm = _e[0], setSearchTerm = _e[1];
    var _f = react_1.useState(0), currentIndex = _f[0], setCurrentIndex = _f[1];
    var _g = react_1.useState([]), requests = _g[0], setRequests = _g[1];
    var itemsPerPage = 12;
    react_1.useEffect(function () {
        function loadRequests() {
            return __awaiter(this, void 0, void 0, function () {
                var res, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fetch('/api/requests')];
                        case 1:
                            res = _a.sent();
                            if (!res.ok) return [3 /*break*/, 3];
                            return [4 /*yield*/, res.json()];
                        case 2:
                            data = _a.sent();
                            setRequests(data);
                            _a.label = 3;
                        case 3: return [2 /*return*/];
                    }
                });
            });
        }
        if (tab === 'requests')
            loadRequests();
    }, [tab]);
    var filteredUsers = react_1.useMemo(function () { return physics.filter(function (p) {
        return p.name.toLowerCase().includes(searchTerm.toLowerCase());
    }); }, [physics, searchTerm]);
    var totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    react_1.useEffect(function () {
        if (currentIndex >= totalPages)
            setCurrentIndex(0);
    }, [totalPages]);
    var startIndex = currentIndex * itemsPerPage;
    var currentUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);
    var goToPrevious = function () { return setCurrentIndex(function (prev) { return prev > 0 ? prev - 1 : totalPages - 1; }); };
    var goToNext = function () { return setCurrentIndex(function (prev) { return prev < totalPages - 1 ? prev + 1 : 0; }); };
    var handleApprove = function (id) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch("/api/requests/" + id + "/approve", { method: 'POST' })];
                case 1:
                    _a.sent();
                    setRequests(function (reqs) { return reqs.map(function (r) { return r.id === id ? __assign(__assign({}, r), { status: 'APPROVED' }) : r; }); });
                    return [2 /*return*/];
            }
        });
    }); };
    var handleReject = function (id) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch("/api/requests/" + id + "/reject", { method: 'POST' })];
                case 1:
                    _a.sent();
                    setRequests(function (reqs) { return reqs.map(function (r) { return r.id === id ? __assign(__assign({}, r), { status: 'REJECTED' }) : r; }); });
                    return [2 /*return*/];
            }
        });
    }); };
    var statusRequests = requests.filter(function (r) { return r.status === statusTab; });
    var typeRequests = statusRequests.filter(function (r) { return r.type === typeTab; });
    return (react_1["default"].createElement("div", null,
        react_1["default"].createElement("div", { className: "flex space-x-4 mb-4" },
            react_1["default"].createElement("button", { className: "bg-primaryColor text-white p-2 hover:bg-secondaryColor " + (tab === 'users' ? 'font-bold' : ''), onClick: function () { return setTab('users'); } }, "Utilizatori"),
            react_1["default"].createElement("button", { className: "bg-primaryColor text-white p-2 hover:bg-secondaryColor " + (tab === 'requests' ? 'font-bold' : ''), onClick: function () { return setTab('requests'); } }, "Cereri")),
        tab === 'users' ? (react_1["default"].createElement(react_1["default"].Fragment, null,
            react_1["default"].createElement("div", { className: "flex justify-center mb-4" },
                react_1["default"].createElement("input", { type: "text", placeholder: "Caut\u0103 utilizator...", value: searchTerm, onChange: function (e) { return setSearchTerm(e.target.value); }, className: "w-1/2 p-2 border rounded" })),
            react_1["default"].createElement("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-4" }, currentUsers.map(function (physic) {
                var _a, _b;
                return (react_1["default"].createElement(providerCard_1["default"], { key: physic.id, forAdmin: true, name: physic.name, image: physic.image, role: physic.role, email: physic.email, isProvider: Boolean(physic.provider), online: (_a = physic.provider) === null || _a === void 0 ? void 0 : _a.online, rating: ((_b = physic.provider) === null || _b === void 0 ? void 0 : _b.rating) || 0, description: "Lorem ipsum dolor sit amet", reviews: Math.floor(Math.random() * 100), speciality: "Speciality" }));
            })),
            totalPages > 1 && (react_1["default"].createElement("div", { className: "flex items-center justify-center space-x-4 mt-6" },
                react_1["default"].createElement("button", { onClick: goToPrevious, className: "p-2 bg-gray-200 rounded" },
                    react_1["default"].createElement(fa_1.FaCaretLeft, null)),
                Array.from({ length: totalPages }).map(function (_, i) { return (react_1["default"].createElement("button", { key: i, className: "px-2 py-1 rounded " + (i === currentIndex ? 'bg-gray-600 text-white' : 'bg-gray-300'), onClick: function () { return setCurrentIndex(i); } }, i + 1)); }),
                react_1["default"].createElement("button", { onClick: goToNext, className: "p-2 bg-gray-200 rounded" },
                    react_1["default"].createElement(fa_1.FaCaretRight, null)))))) : (react_1["default"].createElement("div", null,
            react_1["default"].createElement("div", { className: "flex space-x-4 mb-4" }, ['PENDING', 'APPROVED', 'REJECTED'].map(function (s) { return (react_1["default"].createElement("button", { key: s, className: "text-white px-3 py-1 rounded " +
                    (s === 'PENDING'
                        ? 'bg-yellow-500'
                        : s === 'APPROVED'
                            ? 'bg-green-500'
                            : 'bg-red-500') +
                    (statusTab === s ? ' font-bold underline' : ''), onClick: function () { return setStatusTab(s); } }, s.charAt(0) + s.slice(1).toLowerCase())); })),
            react_1["default"].createElement("div", { className: "flex space-x-4 mb-4" }, [
                { key: 'SPECIALITY', label: 'Specialități' },
                { key: 'TOOL', label: 'Unelte' },
                { key: 'READING', label: 'Reading-uri' }
            ].map(function (tabInfo) { return (react_1["default"].createElement("button", { key: tabInfo.key, className: typeTab === tabInfo.key ? 'font-bold underline' : '', onClick: function () { return setTypeTab(tabInfo.key); } }, tabInfo.label)); })),
            react_1["default"].createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" }, typeRequests.length > 0 ? (typeRequests.map(function (req) { return (react_1["default"].createElement(EntityRequestApproval_1["default"], { key: req.id, title: req.name, description: req.description, price: typeTab === 'SPECIALITY' ? undefined : req.price, status: req.status, createdByName: req.createdByName, createdAt: req.createdAt, onApprove: function () { return handleApprove(req.id); }, onReject: function () { return handleReject(req.id); } })); })) : (react_1["default"].createElement("p", { className: "text-gray-500" }, "Nici o cerere \u00EEn aceast\u0103 categorie \u0219i stare.")))))));
};
exports["default"] = AdminPsychics;
