const { ethers } = require("hardhat");

networkConfig = {
    5: {
        name: "goerli",
        vrfCoordinatorV2: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909",
        subscriptionId: "8182",
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        entranceFee: ethers.utils.parseEther("0.01"),
        interval: "30",
        callBackGasLimit: "500000",
    },
    31337: {
        name: "hardhat",
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        entranceFee: ethers.utils.parseEther("0.01"),
        interval: "30",
        callBackGasLimit: "500000",
    },
}

const developmentChains = ["hardhat", "localhost"];
module.exports = {
    networkConfig,
    developmentChains,
}