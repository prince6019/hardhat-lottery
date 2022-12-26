const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    let VRFCoordinatorV2Address, subscriptionId;

    if (developmentChains.includes(network.name)) {

        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        VRFCoordinatorV2Address = vrfCoordinatorV2Mock.address;
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionRecipt = await transactionResponse.wait();
        subscriptionId = transactionRecipt.events[0].args.subId;
        // fund the subscriptions
        // ususally , you'd need the link token on a real network

        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);

    } else {
        VRFCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
        subscriptionId = networkConfig[chainId]["subscriptionId"];
    }

    const arguments = [
        VRFCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId]["gasLane"],
        networkConfig[chainId]["entranceFee"],
        networkConfig[chainId]["interval"],
        networkConfig[chainId]["callBackGasLimit"],
    ];
    log("deploying raffle contract ------------");
    const lottery = await deploy("Lottery", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("verifying....");
        await verify(lottery.address, arguments);
    }
    log("----------------------------------");
}


module.exports.tags = ["all", "lottery"];