// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.18;

import "hardhat/console.sol";
import "./VotingToken.sol";

contract Treasury {
 struct Withdrawal {
        uint256 id;
        uint256 amount;
        string description;
        uint256 endTime;
        uint256 positiveVotes;
        uint256 negativeVotes;
        bool executed;
    }

    address public owner;
    VotingToken public votingToken;
    uint256 public totalFunds;
    uint256 public withdrawalCounter;

    mapping(uint256 => Withdrawal) public withdrawals;
    mapping(uint256 => mapping(address => uint256)) votes; // Request id => Voter => votes

    // Init
    constructor(address _token) {
        owner = msg.sender;
        votingToken = VotingToken(_token);
    }

    event FundsStored(uint256 amount, address from);
    event WithdrawalRequestInitiated(uint256 requestId, uint256 amount, string description, uint256 duration);
    event Vote(uint256 requestId, address voter, bool isInFavour, uint256 votes);
    event WithrawalExecuted(uint256 requestId, address to, uint256 amount);
    event UnlockTokens(uint256 requestId, address to, uint256 tokens);

    modifier onlyOwner() {
        require(msg.sender == owner, "Allowed only for owner");
        _;
    }

    // Store Funds
    function storeFunds() external payable {
        uint256 amount = msg.value;
        address funder = msg.sender;

        require(amount > 0, "Amount should be positive");
        require(funder != address(0), "Invalid funder address");

        emit FundsStored(amount, funder);

        totalFunds += amount;
    }

    // Initiate withdrawal
    function initiateWithdrawal(uint256 amount, string memory description, uint256 votingDuration) external onlyOwner {
        require(amount <= totalFunds, "Insufficient funds");
        require(votingDuration > 0, "Duration should be > 0");
        bytes memory descriptionBytes = bytes(description);
        require(descriptionBytes.length > 0, "No description");

        withdrawalCounter++;
        Withdrawal memory withdrawal = Withdrawal({
            id: withdrawalCounter,
            amount: amount,
            description: description,
            endTime:  block.timestamp + votingDuration,
            positiveVotes: 0,
            negativeVotes: 0,
            executed: false
        });

        emit WithdrawalRequestInitiated(withdrawalCounter, amount, description, votingDuration);
        withdrawals[withdrawalCounter] = withdrawal;
    }

    // Voting
    function vote(uint256 requestId, bool isInFavour, uint256 voteAmount) external {
        Withdrawal storage withdrawal = withdrawals[requestId];
        address voter = msg.sender;

        require(block.timestamp <= withdrawal.endTime, "Voting has ended");
        require(votes[requestId][voter] == 0, "Already voted");
        require(votingToken.balanceOf(voter) >= voteAmount, "Invalid votes");

        votes[requestId][voter] = voteAmount;

        if (isInFavour) {
            withdrawal.positiveVotes += voteAmount;
        } else {
            withdrawal.negativeVotes += voteAmount;
        }

        emit Vote(requestId, voter, isInFavour, voteAmount);

        votingToken.transferToTreasury(voter, address(this), voteAmount);
    }

    // Withdrawal execution
    function executeWithdrawal(uint256 requestId, address payable recipient) external onlyOwner {
        Withdrawal storage withdrawal = withdrawals[requestId];

        require(block.timestamp > withdrawal.endTime, "Voting has not finished");
        require(!withdrawal.executed, "Amount already withdrawn");

        require(withdrawal.positiveVotes > withdrawal.negativeVotes || withdrawal.positiveVotes == 0 && withdrawal.negativeVotes == 0, "Request was not approved.");

        withdrawal.executed = true;
        totalFunds -= withdrawal.amount;

        emit WithrawalExecuted(requestId, recipient, withdrawal.amount);

        (bool success, ) = recipient.call{value: withdrawal.amount}("");
        require(success, "Failed to send funds");
    }

    // Unlock Tokens
    function unlockTokens(uint256 requestId, address recipient) external {
        Withdrawal storage withdrawal = withdrawals[requestId];
        require(block.timestamp > withdrawal.endTime, "Voting not finished");

        uint256 tokens = votes[requestId][msg.sender];
        require(tokens > 0, "No tokens to unlock");

        votes[requestId][msg.sender] = 0;

        emit UnlockTokens(requestId, recipient, tokens);

        votingToken.transfer(recipient, tokens);
    }
}
