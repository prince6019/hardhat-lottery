const { assert, expect } = require("chai");
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", () => {

        let Lottery, LotteryEntranceFee, deployer;

        beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer;
            Lottery = await ethers.getContract("Lottery", deployer);
            LotteryEntranceFee = await Lottery.getEntranceFee();
        })

        describe("fulfillRandomWords", async () => {
            it("works with live chainlink keepers and chainlink VRF , we get a random winner", async () => {
                // enter the raffle
                const startingTimeStamp = await Lottery.getLastTimeStamp();
                const accounts = await ethers.getSigners();

                await new Promise(async (resolve, reject) => {
                    //setup listener before we enter the raffle
                    //just in case the blockchain moves really fast
                    Lottery.once("WinnerPicked", async () => {
                        console.log("winnerPicked event fired");

                        try {
                            const recentWinner = await Lottery.getRecentWinner();
                            const lotteryState = await Lottery.getLotteryState();
                            const winnerEndingBalance = accounts[0].getBalance();
                            const endingTimeStamp = await lotteryState.getLastTimeStamp();

                            await expect(Lottery.getPlayer(0)).to.be.reverted;
                            assert.equal(recentWinner.toString(), accounts[0].address);
                            assert.equal(lotteryState, 0);

                            assert.equal(winnerEndingBalance.toString(), winnerStartingBalance.add(LotteryEntranceFee).toString());
                            assert(endingTimeStamp > startingTimeStamp);

                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    })
                    //then entering the raffle
                    console.log("entering the raffle");
                    const tx = await Lottery.enterRaffle({ value: LotteryEntranceFee })
                    await tx.wait(1)
                    console.log("Ok, time to wait...")
                    const winnerStartingBalance = await accounts[0].getBalance()

                    // and this code won't complete until our listener has finished listening.
                })
            })
        })
    })