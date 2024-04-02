import OpenInsureApp from '../../build/contracts/OpenInsureApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.openInsureApp = new this.web3.eth.Contract(OpenInsureApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {

            this.owner = accts[0];

            let counter = 1;

            while (this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while (this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
        let self = this;
        self.openInsureApp.methods
            .isOperational()
            .call({ from: self.owner }, callback);
    }

    registerAirline(airlineName, airlineAddress, callback) {
        let self = this;
        self.openInsureApp.methods
            .registerAirline(airlineName, airlineAddress)
            .send({ from: self.owner, gas: 6721900 }, callback);
    }

    fundAirline(airlineAddress, callback) {
        let self = this;
        const fee = this.web3.utils.toWei('10', 'ether');
        self.openInsureApp.methods
            .fundAirline(airlineAddress)
            .send({ from: airlineAddress, value: fee }, callback);
    }

    voteForAirline(airlineAddress, callback) {
        let self = this;
        self.openInsureApp.methods
            .voteForAirline(airlineAddress)
            .send({ from: self.owner, gas: 6721900 }, callback);
    }

    isAirlineRegistered(airlineAddress, callback) {
        let self = this;
        self.openInsureApp.methods
            .isAirlineRegistered(airlineAddress)
            .call({ from: self.owner }, callback);
    }

    isAirlineFunded(airlineAddress, callback) {
        let self = this;
        self.openInsureApp.methods
            .isAirlineFunded(airlineAddress)
            .call({ from: self.owner }, callback);
    }

    isAirlinePending(airlineAddress, callback) {
        let self = this;
        self.openInsureApp.methods
            .isAirlinePending(airlineAddress)
            .call({ from: self.owner }, callback);
    }

    buy(flightName, airlineAddress, timestamp, amount, callback) {
        let self = this;
        const insuredAmount = this.web3.utils.toWei(amount, 'ether');
        self.openInsureApp.methods
            .buy(flightName, airlineAddress, timestamp)
            .send({ from: self.owner, gas: 6721900, value: insuredAmount }, callback);
    }

    fetchFlightStatus(flightName, airlineAddress, timestamp, callback) {
        let self = this;
        let payload = {
            airline: airlineAddress,
            flight: flightName,
            timestamp: timestamp
        }
        self.openInsureApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner }, (error, result) => {
                callback(error, payload);
            });
    }

    getPassengerCredit(passangerAddress, callback) {
        let self = this;
        self.openInsureApp.methods
            .getPassengerCredit(passangerAddress)
            .call({ from: self.owner }, callback);
    }

    withdrawCredit(pessangerAddress, callback) {
        let self = this;
        self.openInsureApp.methods
            .withdrawCredit(pessangerAddress)
            .send({ from: self.owner }, (error, result) => {
                callback(error, result);
            });
    }
}