// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

abstract contract PhaseMint {
    mapping(bytes32 => PhaseStats) public phasesStats; // Tracks stats for each phase

    /// @notice Stores the statistics of each phase, including total minted and per-user mints.
    struct PhaseStats {
        uint256 mintedTotal;
        mapping(address => uint256) mintedByUser;
    }

    /// @notice Checks if the phase constraints for minting are respected.
    /// @dev Ensures that the amount minted doesn't exceed phase or user limits.
    /// @param _to The address to mint the tokens to.
    /// @param _amount The number of tokens to mint.
    /// @param _phaseID The identifier for the current minting phase.
    /// @param _maxPerTx The maximum number of tokens allowed per transaction.
    /// @param _maxPerUser The maximum number of tokens allowed per user for the phase.
    /// @param _maxPerPhase The total maximum number of tokens allowed for the phase.
    function _mintPhase(
        address _to,
        uint256 _amount,
        bytes32 _phaseID,
        uint256 _maxPerTx,
        uint256 _maxPerUser,
        uint256 _maxPerPhase
    ) internal {
        PhaseStats storage currentPhaseStats = phasesStats[_phaseID];

        if (_maxPerTx > 0) {
            require(_maxPerTx >= _amount, "Exceeds max per tx");
        }

        if (_maxPerUser > 0) {
            require(
                currentPhaseStats.mintedByUser[_to] + _amount <= _maxPerUser,
                "Exceeds max per user"
            );
        }

        if (_maxPerPhase > 0) {
            require(
                currentPhaseStats.mintedTotal + _amount <= _maxPerPhase,
                "Exceeds max per phase"
            );
        }

        currentPhaseStats.mintedTotal += _amount;
        currentPhaseStats.mintedByUser[_to] += _amount;
    }

    /// @notice Returns the total number of tokens minted by a user in a specific phase.
    /// @param _user The address of the user.
    /// @param _phaseID The identifier for the minting phase.
    /// @return The number of tokens minted by the user in the phase.
    function mintedByUser(
        address _user,
        bytes32 _phaseID
    ) public view returns (uint256) {
        return phasesStats[_phaseID].mintedByUser[_user];
    }

    /// @notice Returns the total number of tokens minted in a specific phase.
    /// @param _phaseID The identifier for the minting phase.
    /// @return The total number of tokens minted in the phase.
    function mintedTotal(bytes32 _phaseID) public view returns (uint256) {
        return phasesStats[_phaseID].mintedTotal;
    }
}