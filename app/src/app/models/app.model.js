"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationForce = exports.isNodeVendorType = void 0;
function isNodeVendorType(arg) {
    return arg.__type === "NodeVendorType";
}
exports.isNodeVendorType = isNodeVendorType;
var SimulationForce;
(function (SimulationForce) {
    SimulationForce["GRAVITY"] = "GRAVITY";
    SimulationForce["LINK"] = "LINK";
    SimulationForce["COLLISION"] = "COLLISION";
    SimulationForce["VENDOR"] = "VENDOR";
})(SimulationForce = exports.SimulationForce || (exports.SimulationForce = {}));
