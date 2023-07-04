require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

require("./tasks");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_URL,
      accounts: [
        process.env.ACCOUNT_1,
        process.env.ACCOUNT_2,
        process.env.ACCOUNT_3,
      ],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
