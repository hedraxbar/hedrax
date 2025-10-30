// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PaymentSplitter
 * @dev Contract for manually splitting payments between multiple addresses
 */
abstract contract PaymentSplitter is ReentrancyGuard {
    using SafeMath for uint256;

    // Events
    event PaymentSplit(address token, address to, uint256 amount);
    event PaymentSharesUpdated(
        address[] paymentReceivers,
        uint256[] paymentShares
    );

    // Constants
    uint256 public constant TOTAL_PAYMENT_SHARES = 10000; // 100% = 10000 (0.01% precision)

    // State variables
    address[] public paymentReceivers;
    uint256[] public paymentShares;

    /**
     * @dev Internal function to update paymentShares with validations
     */
    function _updatePaymentShares(
        address[] memory _receivers,
        uint256[] memory _shares
    ) internal {
        require(_receivers.length == _shares.length, "Arrays length mismatch");
        require(_receivers.length > 0, "No paymentReceivers provided");

        uint256 _totalShares;
        for (uint256 i = 0; i < _receivers.length; i++) {
            require(_receivers[i] != address(0), "Invalid receiver address");
            require(_shares[i] > 0, "Share must be greater than 0");
            _totalShares = _totalShares.add(_shares[i]);
        }

        require(
            _totalShares == TOTAL_PAYMENT_SHARES,
            "Total paymentShares must be 10000"
        );

        paymentReceivers = _receivers;
        paymentShares = _shares;

        emit PaymentSharesUpdated(_receivers, _shares);
    }

    /**
     * @dev Splits ETH payment among paymentReceivers according to their paymentShares
     */
    function _splitETHPayment() internal nonReentrant {
        uint256 amount = address(this).balance;
        require(amount > 0, "Amount must be greater than 0");

        uint256 remaining = amount;
        uint256 payment;

        // Process all paymentReceivers except the last one
        for (uint256 i = 0; i < paymentReceivers.length - 1; i++) {
            payment = amount.mul(paymentShares[i]).div(TOTAL_PAYMENT_SHARES);
            remaining = remaining.sub(payment);

            (bool success, ) = paymentReceivers[i].call{value: payment}("");
            require(success, "ETH transfer failed");
            emit PaymentSplit(address(0), paymentReceivers[i], payment);
        }

        // Send remaining amount to last receiver to handle rounding dust
        if (remaining > 0 && paymentReceivers.length > 0) {
            (bool success, ) = paymentReceivers[paymentReceivers.length - 1]
                .call{value: remaining}("");
            require(success, "ETH transfer failed");
            emit PaymentSplit(
                address(0),
                paymentReceivers[paymentReceivers.length - 1],
                remaining
            );
        }
    }

    /**
     * @dev Splits ERC20 token payment among paymentReceivers according to their paymentShares
     * @param token The ERC20 token contract address
     
     */
    function _splitTokenPayment(IERC20 token) internal nonReentrant {
        require(address(token) != address(0), "Invalid token address");
        uint256 amount = token.balanceOf(address(this));
        require(amount > 0, "Amount must be greater than 0");

        uint256 remaining = amount;
        uint256 payment;

        // Process all paymentReceivers except the last one
        for (uint256 i = 0; i < paymentReceivers.length - 1; i++) {
            payment = amount.mul(paymentShares[i]).div(TOTAL_PAYMENT_SHARES);
            remaining = remaining.sub(payment);

            require(
                token.transfer(paymentReceivers[i], payment),
                "Token transfer failed"
            );
            emit PaymentSplit(address(token), paymentReceivers[i], payment);
        }

        // Send remaining amount to last receiver to handle rounding dust
        if (remaining > 0 && paymentReceivers.length > 0) {
            require(
                token.transfer(
                    paymentReceivers[paymentReceivers.length - 1],
                    remaining
                ),
                "Token transfer failed"
            );
            emit PaymentSplit(
                address(token),
                paymentReceivers[paymentReceivers.length - 1],
                remaining
            );
        }
    }

    /**
     * @dev Returns the current paymentReceivers and their paymentShares
     */
    function getPaymentShares()
        external
        view
        returns (address[] memory, uint256[] memory)
    {
        return (paymentReceivers, paymentShares);
    }
}