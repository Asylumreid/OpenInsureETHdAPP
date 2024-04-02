import OpenInsureApp from '../../build/contracts/OpenInsureApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
import "babel-polyfill";


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let openInsureApp = new web3.eth.Contract(OpenInsureApp.abi, config.appAddress);

async function registerOracles() {
	const fee = await openInsureApp.methods.getRegistrationFee().call()
	const accounts = await web3.eth.getAccounts();
	for (const account of accounts) {
		console.log('account=', account)
		await openInsureApp.methods.registerOracle().send({
			from: account,
			value: fee,
			gas: 6721900
		});
	}
	console.log('[', accounts.length, '] Oracles registered');
}

async function simulateOracleResponse(requestedIndex, airline, flight, timestamp) {
	const accounts = await web3.eth.getAccounts();
	for (const account of accounts) {
		var indexes = await openInsureApp.methods.getMyIndexes().call({ from: account });
		console.log("Oracles indexes: " + indexes + " for account: " + account);
		for (const index of indexes) {
			try {
				if (requestedIndex == index) {
					console.log("Submitting Oracle response For Flight: " + flight + " at Index: " + index);
					await openInsureApp.methods.submitOracleResponse(
						index, airline, flight, timestamp, 20
					).send({ from: account, gas: 6721900 });

				}
			} catch (e) {
				console.log(e);
			}
		}
	}
}

registerOracles();

openInsureApp.events.OracleRequest({}).on('data', async (event, error) => {
	if (!error) {
		await simulateOracleResponse(
			event.returnValues[0],
			event.returnValues[1],
			event.returnValues[2],
			event.returnValues[3] 
		);
	}
});

openInsureApp.events.FlightStatusInfo({}).on('data', async (event, error) => {
	console.log("event=", event);
	console.log("error=", error);
});

// a counter with list on the number of status code:
// Initialize status counts
let statusCounts = {
    '0': 0, '10': 0, '20': 0, '30': 0, '40': 0, '50': 0
};

flightSuretyApp.events.FlightStatusInfo({
    fromBlock: 'latest'
}, function (error, event) {
    if (error) {
        console.log(error);
        return;
    }

    const { airline, flight, timestamp, status } = event.returnValues;
    console.log(`FlightStatusInfo event received: flight = ${flight}, status = ${status}`);

    // Increment the count for the received status
    if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
    } else {
        statusCounts[status] = 1;
    }

    // Print the current counts for each status
    console.log('Current Status Counts:', statusCounts);

    // Check the count for status 20
    if (statusCounts['20'] > 3) {
        console.log(`Eligible for credit insurance: flight ${flight} with status code ${status} has occurred ${statusCounts['20']} times.`);
    }
});


const app = express();
app.get('/api', (req, res) => {
	res.send({
		message: 'An API for use with your Dapp!'
	})
})

export default app;


