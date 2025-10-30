// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

abstract contract TradingEnabler {
    bool public tradingEnabled;

    constructor() {
        tradingEnabled = false;
    }

    // Modifier to check if trading is enabled
    modifier tradingEnabledOnly() {
        require(tradingEnabled, "Trading not enabled yet");
        _;
    }

    // Enable trading
    function _enableTrading() internal {
        require(!tradingEnabled, "Trading already enabled");
        tradingEnabled = true;
    }
}