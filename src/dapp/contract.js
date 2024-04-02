import OpenInsureApp from '../../build/contracts/OpenInsureApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(window.ethereum);
        this.openInsureApp = new this.web3.eth.Contract(OpenInsureApp.abi, config.appAddress);
        this.initialize(callback);
        this.airlines = [];
        this.passengers = [];
    }

    async initialize(callback) {
        try {
            const accounts = await this.web3.eth.getAccounts();
            if (accounts.length > 0) {
                this.currentAccount = accounts[0]; // Set the default account
            } else {
                throw new Error("No accounts found. Make sure MetaMask is connected.");
            }
            callback();
        } catch (error) {
            console.error("Initialization error:", error);
        }
    }

    async isOperational(callback) {
        try {
            const result = await this.openInsureApp.methods.isOperational().call({ from: this.currentAccount });
            callback(null, result);
        } catch (error) {
            callback(error, null);
        }
    }

    async registerAirline(airlineName, airlineAddress, callback) {
        try {
            const gasEstimate = await this.openInsureApp.methods.registerAirline(airlineName, airlineAddress).estimateGas({ from: this.currentAccount });
            const result = await this.openInsureApp.methods.registerAirline(airlineName, airlineAddress).send({ from: this.currentAccount, gas: gasEstimate });
            callback(null, result);
        } catch (error) {
            callback(error, null);
        }
    }

    async fundAirline(airlineAddress, callback) {
        try {
            const fee = this.web3.utils.toWei('10', 'ether');
            const gasEstimate = await this.openInsureApp.methods.fundAirline(airlineAddress).estimateGas({ from: airlineAddress, value: fee });
            const result = await this.openInsureApp.methods.fundAirline(airlineAddress).send({ from: this.currentAccount, value: fee, gas: gasEstimate });
            callback(null, result);
        } catch (error) {
            callback(error, null);
        }
    }

    async voteForAirline(airlineAddress, callback) {
        try {
            const gasEstimate = await this.openInsureApp.methods.voteForAirline(airlineAddress).estimateGas({ from: this.currentAccount });
            const result = await this.openInsureApp.methods.voteForAirline(airlineAddress).send({ from: this.currentAccount, gas: gasEstimate });
            callback(null, result);
        } catch (error) {
            callback(error, null);
        }
    }

    async isAirlineRegistered(airlineAddress) {
        try {
            const result = await this.openInsureApp.methods.isAirlineRegistered(airlineAddress).call({ from: this.currentAccount });
            return result;
        } catch (error) {
            console.error("Error in isAirlineRegistered:", error);
            throw error; // Forward the error
        }
    }

    async isAirlineFunded(airlineAddress, callback) {
        try {
            const result = await this.openInsureApp.methods.isAirlineFunded(airlineAddress).call({ from: this.currentAccount });
            callback(null, result);
        } catch (error) {
            callback(error, null);
        }
    }

    async isAirlinePending(airlineAddress, callback) {
        try {
            const result = await this.openInsureApp.methods.isAirlinePending(airlineAddress).call({ from: this.currentAccount });
            callback(null, result);
        } catch (error) {
            callback(error, null);
        }
    }

    async buy(flightName, airlineAddress, timestamp, amount, callback) {
        try {
            const insuredAmount = this.web3.utils.toWei(amount, 'ether');
            const gasEstimate = await this.openInsureApp.methods.buy(flightName, airlineAddress, timestamp).estimateGas({ from: this.currentAccount, value: insuredAmount });
            const result = await this.openInsureApp.methods.buy(flightName, airlineAddress, timestamp).send({ from: this.currentAccount, value: insuredAmount, gas: gasEstimate });
            callback(null, result);
        } catch (error) {
            callback(error, null);
        }
    }

    async fetchFlightStatus(flightName, airlineAddress, timestamp, callback) {
        let payload = {
            airline: airlineAddress,
            flight: flightName,
            timestamp: timestamp
        }
        try {
            const result = await this.openInsureApp.methods
                .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
                .send({ from: this.currentAccount });
            callback(null, payload);
        } catch (error) {
            callback(error, null);
        }
    }

    async getPassengerCredit(passengerAddress, callback) {
        try {
            const result = await this.openInsureApp.methods.getPassengerCredit(passengerAddress).call({ from: this.currentAccount });
            callback(null, result);
        } catch (error) {
            callback(error, null);
        }
    }

    async withdrawCredit(passengerAddress, callback) {
        try {
            const gasEstimate = await this.openInsureApp.methods.withdrawCredit(passengerAddress).estimateGas({ from: this.currentAccount });
            const result = await this.openInsureApp.methods.withdrawCredit(passengerAddress).send({ from: this.currentAccount, gas: gasEstimate });
            callback(null, result);
        } catch (error) {
            callback(error, null);
        }
    }


}