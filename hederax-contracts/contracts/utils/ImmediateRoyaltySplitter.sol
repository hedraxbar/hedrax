// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ImmediateRoyaltySplitter
 * @dev Contract for instantly splitting received payments between multiple addresses
 */
abstract contract ImmediateRoyaltySplitter is ReentrancyGuard {
    using SafeMath for uint256;

    // Events
    event PaymentReceived(address from, uint256 amount);
    event PaymentSplit(address to, uint256 amount);
    event RoyaltySharesUpdated(
        address[] royaltyReceivers,
        uint256[] royaltyShares
    );

    // Constants
    uint256 public constant TOTAL_ROYALTY_SHARES = 10000; // 100% = 10000 (0.01% precision)

    // State variables
    address[] public royaltyReceivers;
    uint256[] public royaltyShares;

    /**
     * @dev Internal function to update royaltyShares with validations
     */
    function _updateRoyaltyShares(
        address[] memory _receivers,
        uint256[] memory _shares
    ) internal {
        require(_receivers.length == _shares.length, "Arrays length mismatch");
        require(_receivers.length > 0, "No royaltyReceivers provided");

        uint256 _totalShares;
        for (uint256 i = 0; i < _receivers.length; i++) {
            require(_receivers[i] != address(0), "Invalid receiver address");
            require(_shares[i] > 0, "Share must be greater than 0");
            _totalShares = _totalShares.add(_shares[i]);
        }

        require(
            _totalShares == TOTAL_ROYALTY_SHARES,
            "Total royaltyShares must be 10000"
        );

        royaltyReceivers = _receivers;
        royaltyShares = _shares;

        emit RoyaltySharesUpdated(_receivers, _shares);
    }

    /**
     * @dev Private function to set the royalty shares only if they are not set yet
     */
    function _initializeRoyaltyShares(
        address[] memory _receivers,
        uint256[] memory _shares
    ) internal {
        require(royaltyReceivers.length == 0, "Royalty shares already set");
        _updateRoyaltyShares(_receivers, _shares);
    }

    /**
     * @dev Fallback function to receive and immediately split payments
     */
    receive() external payable nonReentrant {
        require(msg.value > 0, "No payment received");
        emit PaymentReceived(msg.sender, msg.value);

        uint256 remaining = msg.value;
        uint256 share;
        uint256 amount;

        // Process all royaltyReceivers except the last one
        for (uint256 i = 0; i < royaltyReceivers.length - 1; i++) {
            share = royaltyShares[i];
            // Calculate payment amount using the share percentage
            amount = msg.value.mul(share).div(TOTAL_ROYALTY_SHARES);
            remaining = remaining.sub(amount);

            (bool success, ) = royaltyReceivers[i].call{value: amount}("");
            require(success, "Transfer failed");
            emit PaymentSplit(royaltyReceivers[i], amount);
        }

        // Send remaining amount to last receiver to handle rounding dust
        if (remaining > 0 && royaltyReceivers.length > 0) {
            (bool success, ) = royaltyReceivers[royaltyReceivers.length - 1]
                .call{value: remaining}("");
            require(success, "Transfer failed");
            emit PaymentSplit(
                royaltyReceivers[royaltyReceivers.length - 1],
                remaining
            );
        }
    }

    /**
     * @dev Returns the current royaltyReceivers and their royaltyShares
     */
    function getRoyaltyShares()
        external
        view
        returns (address[] memory, uint256[] memory)
    {
        return (royaltyReceivers, royaltyShares);
    }

    /**
     * @dev Allows a royalty receiver to update their wallet address
     * @param newAddress The new address to update to
     */
    function updateReceiverAddress(address newAddress) external nonReentrant {
        require(newAddress != address(0), "New address is invalid");

        bool updated = false;
        for (uint256 i = 0; i < royaltyReceivers.length; i++) {
            if (royaltyReceivers[i] == msg.sender) {
                royaltyReceivers[i] = newAddress;
                updated = true;
                break;
            }
        }

        require(updated, "Receiver address not found");
    }
}