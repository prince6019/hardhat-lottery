const { assert } = require("chai");
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", async () => {

        let Lottery, vrfCoordinatorV2Mock;
        const entrance_fee = ethers.utils.parseEther("0.1");
        const chainId = network.consfig.chainId;

        beforeEach(async () => {
            const { deployer } = await getNamedAccounts();
            await deployments.fixture(["all"]);
            Lottery = await ethers.getContract("Lottery", deployer);
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
        })

        describe("constructor", async () => {
            it("initializes the lottery correctly", async () => {

                const lotteryState = await Lottery.getLotteryState();
                const lotteryInterval = await Lottery.getInterval();
                assert.equal(lotteryState.toString(), "0");
                assert.equal(lotteryInterval.toString(), networkConfig[chainId]["interval"]);
            })
        })
    })