const { assert, expect } = require("chai");
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", () => {

        let Lottery, vrfCoordinatorV2Mock, LotteryEntranceFee, deployer, interval;
        const chainId = network.config.chainId;

        beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer;
            await deployments.fixture(["all"]);
            Lottery = await ethers.getContract("Lottery", deployer);
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
            LotteryEntranceFee = await Lottery.getEntranceFee();
            interval = await Lottery.getInterval();
        })

        describe("constructor", () => {
            it("initializes the lottery correctly", async () => {

                const lotteryState = await Lottery.getLotteryState();
                const lotteryInterval = await Lottery.getInterval();
                assert.equal(lotteryState.toString(), "0");
                assert.equal(lotteryInterval.toString(), networkConfig[chainId]["interval"]);
            })
        })

        describe("enterLottery", () => {
            it("revert when you don't pay enough", async () => {
                await expect(Lottery.enterRaffle()).to.be.revertedWith("lottery__erorr");
            })
            it("records players when they enter", async () => {
                await Lottery.enterRaffle({ value: LotteryEntranceFee });
                const playerFromContract = await Lottery.getPlayer(0);
                assert.equal(playerFromContract, deployer);
            })
            it("emits event on enter", async () => {
                await expect(Lottery.enterRaffle({ value: LotteryEntranceFee })).to.emit(
                    Lottery,
                    "Lottery_enter"
                );
            })
            it("doesn't allow entrance when raffle is calculating", async () => {
                await Lottery.enterRaffle({ value: LotteryEntranceFee })
                // for a documentation of the methods below, go here: https://hardhat.org/hardhat-network/reference
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.send("evm_mine", []);
                // we pretend to be a keeper for a second
                await Lottery.performUpkeep([]) // changes the state to calculating for our comparison below
                await expect(Lottery.enterRaffle({ value: LotteryEntranceFee })).to.be.revertedWith( // is reverted as raffle is calculating
                    "Lottery__LotteryNotOpen"
                )
            })
        })
        describe("checkUpKeep", () => {
            it("return false if people haven't send enough eth", async () => {
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                await network.provider.send("evm_mine", []);
                const { upKeepNeeded } = await Lottery.callStatic.checkUpkeep("0x");
                assert(!upKeepNeeded);
            })
            it("returns false if lottery is not open", async () => {
                await Lottery.enterRaffle({ value: LotteryEntranceFee });
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                await network.provider.send("evm_mine", []);
                await Lottery.performUpkeep([]);
                const lotteryState = await Lottery.getLotteryState();
                assert.equal(lotteryState.toString(), "1");
            })
            it("return false if enough time hasn't passed", async () => {
                await Lottery.enterRaffle({ value: LotteryEntranceFee });

                await network.provider.send("evm_increaseTime", [interval.toNumber() - 10]);
                await network.provider.send("evm_mine", []);

                const { upKeepNeeded } = await Lottery.callStatic.checkUpkeep("0x");
                assert(!upKeepNeeded);
            })
            it("returns true if enough time has passed, has players, eth, and is open", async () => {
                await Lottery.enterRaffle({ value: LotteryEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const { upkeepNeeded } = await Lottery.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                assert(upkeepNeeded)
            })
        })
        describe("performUpKeep", () => {
            it("can only run if checkUpkeep is true", async () => {
                await Lottery.enterRaffle({ value: LotteryEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const tx = await Lottery.performUpkeep("0x");
                assert(tx);
            })
            it("reverts if checkupKeep is false", async () => {
                await expect(Lottery.performUpkeep("0x")).to.be.revertedWith("Lottery__UpKeepNotNeeded");
            })
            it("updates the raffle state and emit the request id", async () => {
                await Lottery.enterRaffle({ value: LotteryEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const tx = await Lottery.performUpkeep("0x");
                const txReceipt = await tx.wait(1);
                const lotteryState = await Lottery.getLotteryState();
                const RequestId = txReceipt.events[1].args.requestId;
                assert(lotteryState.toString() == "1");
                assert(RequestId.toNumber() > 0);
            })
        })
        describe("fullfillRandomWords", () => {
            beforeEach(async () => {
                await Lottery.enterRaffle({ value: LotteryEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
            })

            it("can only be called after performUpKeep", async () => {
                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, Lottery.address)).to.be.revertedWith("nonexistent request");

            })
            it("picks up a winner , resets the lottery and send money", async () => {
                const additionalEntrants = 3;
                const startingAccountIndex = 1;
                const accounts = await ethers.getSigners();
                for (let i = startingAccountIndex; i < startingAccountIndex + additionalEntrants; i++) {
                    const accountConnectedRaffle = Lottery.connect(accounts[i]);
                    await accountConnectedRaffle.enterRaffle({ value: LotteryEntranceFee });
                }

                const startingTimeStamp = await Lottery.getLastTimeStamp();
                await new Promise(async (resolve, reject) => {
                    Lottery.once("WinnerPicked", async () => {
                        try {
                            const recentWinner = await Lottery.getRecentWinner();
                            const lotteryState = await Lottery.getLotteryState();
                            const endingTimeStamp = await Lottery.getLastTimeStamp();
                            const numPlayers = await Lottery.getNumberOfPlayers();
                            const winnerEndingBalance = await accounts[1].getBalance();
                            assert.equal(recentWinner, accounts[1].address);
                            assert.equal(numPlayers.toString(), "0");
                            assert.equal(lotteryState.toString(), "0");
                            assert(endingTimeStamp > startingTimeStamp);

                            assert.equal(winnerEndingBalance.toString(), winnerStartingBalance.add(LotteryEntranceFee.mul(additionalEntrants).add(LotteryEntranceFee)).toString());
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    })
                    const tx = await Lottery.performUpkeep("0x");
                    const txReceipt = await tx.wait(1);
                    const winnerStartingBalance = await accounts[1].getBalance();
                    await vrfCoordinatorV2Mock.fulfillRandomWords(txReceipt.events[1].args.requestId, Lottery.address);
                })
            })

        })
    })