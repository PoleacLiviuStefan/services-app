"use strict";
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
var react_1 = require("react");
var Modal = function (_a) {
    var children = _a.children, title = _a.title, closeModal = _a.closeModal, props = __rest(_a, ["children", "title", "closeModal"]);
    return (react_1["default"].createElement("div", { className: "fixed   flex justify-center items-center top-0 left-0 h-screen w-screen bg-black bg-opacity-50 flex items-center justify-center  z-50 " + props },
        react_1["default"].createElement("div", { className: "relative bg-white rounded-lg shadow-lg p-6 overflow-auto max-w-md w-full space-y-4" },
            react_1["default"].createElement("h3", { className: 'font-extrabold text-xl' }, title),
            react_1["default"].createElement("button", { className: "absolute top-2 right-2 ", onClick: closeModal }, "X"),
            children)));
};
exports["default"] = Modal;
