// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.18;
import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract VotingToken is ERC20 {
    constructor(uint256 initialSupply, address[] memory stakeholders) ERC20("Treasury Voting Token", "TVT") {
        _mint(msg.sender, initialSupply);

        // equally distribute to all stakeholders
        uint256 stakeholdersCount = stakeholders.length;
        uint256 tokensPerStakeholder = initialSupply / stakeholdersCount;

        for (uint256 i = 0; i < stakeholdersCount; i++) {
            address stakeholder = stakeholders[i];
            _transfer(msg.sender, stakeholder, tokensPerStakeholder);
        }
    }

    function transferToTreasury(address from, address to, uint256 amount) external {
        _approve(from, to, amount);
        transferFrom(from, to, amount);
    }
}