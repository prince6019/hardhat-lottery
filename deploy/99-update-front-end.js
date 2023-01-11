const fs = require("fs");
const { network } = require("hardhat");

const frontEndContractsFile = "../lottery-frontend/src/constants/ContractAddress.json";
const frontEndAbiFile = "../lottery-frontend/src/constants/abi.json";


module.exports = async () => {
    if (process.env.UPDATE_FRONTEND) {
        console.log("writing to front end...");
        await updateContractAddresses();
        await updateAbi();
        console.log("front end written!");
    }
}

async function updateAbi() {
    const lottery = await ethers.getContract("Lottery");
    fs.writeFileSync(frontEndAbiFile, lottery.interface.format(ethers.utils.FormatTypes.json));
}

async function updateContractAddresses() {
    const chainId = network.config.chainId.toString();
    const lottery = await ethers.getContract("Lottery");
    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"));
    if (network.chainId in contractAddresses) {
        if (!contractAddresses[chainId].includes(lottery.address)) {
            contractAddresses[chainId].push(lottery.address);
        }
    } else {
        contractAddresses[chainId] = [lottery.address]
    }
    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses));
}

module.exports.tags = ["all", "frontend"];