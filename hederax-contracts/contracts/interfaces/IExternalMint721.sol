// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IExternalMint721 {
    function mint(address to, uint256 amount) external;
}