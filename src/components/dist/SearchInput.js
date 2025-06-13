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
exports.__esModule = true;
var react_1 = require("react");
var SearchInput = react_1.forwardRef(function (props, ref) {
    return (react_1["default"].createElement("input", __assign({}, props, { ref: ref, className: 'border border-gray-400 p-2 rounded-md w-full text-sm lg:text-md lg:w-50 py-3 focus:outline-primaryColor', placeholder: props.placeholder || 'Cauta un astrolog' })));
});
SearchInput.displayName = 'SearchInput';
exports["default"] = SearchInput;
