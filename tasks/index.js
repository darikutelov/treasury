const { task } = require("hardhat/config");

task("deploy", "Deploys the Treasury contract")
  .addParam("token", "The token's address")
  .setAction(async (taskArgs, hre) => {
    const [deployer] = await hre.ethers.getSigners();
    const TreasuryFactory = await hre.ethers.getContractFactory(
      "Treasury",
      deployer
    );

    const treasuryFactory = await TreasuryFactory.deploy(taskArgs.token);

    await treasuryFactory.deployed();

    console.log(
      `Treasury with owner ${deployer.address} deployed to ${treasuryFactory.address}`
    );
  });

task("store-funds", "Sends funds to Treasury contract")
  .addParam("treasury", "Treasury address")
  .setAction(async (taskArgs, hre) => {
    const [deployer, firstUser] = await hre.ethers.getSigners();

    const TreasuryFactory = await hre.ethers.getContractFactory(
      "Treasury",
      deployer
    );

    const treasury = await TreasuryFactory.attach(taskArgs.treasury);
    const treasuryFirstUser = treasury.connect(firstUser);
    const amount = 10;

    const tx = await treasuryFirstUser.storeFunds({ value: amount });

    const receipt = await tx.wait();

    if (receipt.status === 0) {
      throw new Error("Transaction failed");
    }

    console.log(
      `The user with address ${firstUser.address} send an amount of ${amount} to the treasury with address ${treasury.address}`
    );
  });
