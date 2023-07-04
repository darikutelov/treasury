const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Treasury", function () {
  let deployer, firstUser, secondUser, thirdUser;

  this.beforeAll(async function () {
    [deployer, firstUser, secondUser, thirdUser] = await ethers.getSigners();
    //const { treasury } = await loadFixture(deployTreasury);
  });

  async function deployTreasury() {
    const tokenFactory = await ethers.getContractFactory(
      "VotingToken",
      deployer
    );

    const token = await tokenFactory.deploy(100, [
      secondUser.address,
      thirdUser.address,
    ]);

    const treasuryFactory = await ethers.getContractFactory(
      "Treasury",
      deployer
    );

    const treasury = await treasuryFactory.deploy(token);

    return { treasury, token };
  }

  async function storeFunds() {
    const { treasury } = await loadFixture(deployTreasury);
    await treasury.connect(thirdUser).storeFunds({ value: 10 });

    return { treasury };
  }

  async function storeFundsAndInitiateWithdrawal() {
    const { treasury } = await loadFixture(storeFunds);
    await treasury.initiateWithdrawal(5, "First withdrawal", 120);

    return { treasury };
  }

  describe("Initiate withdrawal", function () {
    it("Reverts when called not from the owner", async function () {
      const { treasury } = await loadFixture(storeFunds);
      await expect(
        treasury
          .connect(thirdUser)
          .initiateWithdrawal(20, "First withdrawal", 120)
      ).to.be.revertedWith("Allowed only for owner");
    });

    it("Reverts when Insufficient funds", async function () {
      const { treasury } = await loadFixture(storeFunds);
      await expect(
        treasury.initiateWithdrawal(20, "First withdrawal", 120)
      ).to.be.revertedWith("Insufficient funds");
    });

    it("Reverts when zero duration", async function () {
      const { treasury } = await loadFixture(storeFunds);
      await expect(
        treasury.initiateWithdrawal(5, "First withdrawal", 0)
      ).to.be.revertedWith("Duration should be > 0");
    });

    it("Reverts when no description", async function () {
      const { treasury } = await loadFixture(storeFunds);
      await expect(treasury.initiateWithdrawal(5, "", 120)).to.be.revertedWith(
        "No description"
      );
    });

    it("Should succeed", async function () {
      const { treasury } = await loadFixture(storeFunds);
      await treasury.initiateWithdrawal(5, "First withdrawal", 120);

      const withdrawal = await treasury.withdrawals(1);
      expect(withdrawal.id).to.equal(1);
    });

    it("Should emit correct event", async function () {
      const { treasury } = await loadFixture(storeFunds);

      await expect(treasury.initiateWithdrawal(5, "First withdrawal", 120))
        .to.emit(treasury, "WithdrawalRequestInitiated")
        .withArgs(1, 5, "First withdrawal", 120);
    });
  });

  describe("Voting", function () {
    it("Reverts when already voted", async function () {
      const { treasury } = await loadFixture(storeFundsAndInitiateWithdrawal);
      await treasury.connect(secondUser).vote(1, true, 1);
      await expect(
        treasury.connect(secondUser).vote(1, true, 1)
      ).to.be.revertedWith("Already voted");
    });

    it("Successful voting", async function () {
      const { treasury } = await loadFixture(storeFundsAndInitiateWithdrawal);

      await expect(treasury.connect(secondUser).vote(1, true, 1))
        .to.emit(treasury, "Vote")
        .withArgs(1, secondUser.address, true, 1);
    });
  });
});
