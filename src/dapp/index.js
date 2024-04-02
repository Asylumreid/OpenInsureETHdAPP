
import DOM from './dom';
import Contract from './contract';
import Web3 from 'web3';
import './openinsure.css';

const GANACHE_OWNER_ACCOUNT = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";

(async () => {
    if (window.ethereum) {
        try {
            // Request to enable the MetaMask extension
            // MetaMask will prompt the user for permission to access their accounts.
            await window.ethereum.enable();
            let web3 = new Web3(window.ethereum);
            const accounts = await web3.eth.getAccounts();
            const userAccount = accounts[0]

             // Function to handle account changes
             const handleAccountsChanged = async (accounts) => {
                // Refresh the page when the accounts change
                window.location.reload();
            };

            // Subscribe to accountsChanged event
            window.ethereum.on('accountsChanged', handleAccountsChanged);

            // Subscribe to chainChanged event
            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });

    let contract = new Contract('localhost', async () => {
        // Read transaction
        contract.isOperational(async (error, result) => {
            console.log(error, result);
            display('display-wrapper-operational', 'Welcome to OpenInsure', 'Insure your flights now!', [{ label: 'Site Status', error: error, value: result }]);

            let isOwnerOrRegistered = await checkIfOwnerOrRegistered(contract, userAccount, web3);
            displaySectionBasedOnRole(isOwnerOrRegistered);
        });

        
        DOM.elid('submit-airline').addEventListener('click', () => {
            let airlineName = DOM.elid('airline-name').value;
            let airlineAddress = DOM.elid('airline-address').value;
            contract.registerAirline(airlineName, airlineAddress, (error, result) => {
                displayTx('display-wrapper-register', [{ label: 'Airline registered Tx', error: error, value: JSON.stringify(result )}]);
                DOM.elid('airline-name').value = "";
                DOM.elid('airline-address').value = "";
            });
        })

        DOM.elid('fund-airlines').addEventListener('click', () => {
            let airlineAddress = DOM.elid('airline-fund-address').value;
            contract.fundAirline(airlineAddress, (error, result) => {
                displayTx('display-wrapper-register', [{ label: 'Airline funded Tx', error: error, value: JSON.stringify(result, null, 2) }]);
                DOM.elid('airline-fund-address').value = "";
            });
        })

        DOM.elid('vote-airlines').addEventListener('click', () => {
            let airlineAddress = DOM.elid('airline-fund-address').value;
            contract.voteForAirline(airlineAddress, (error, result) => {
                displayTx('display-wrapper-register', [{ label: 'Airline voted Tx', error: error, value:JSON.stringify( result )}]);
                DOM.elid('airline-fund-address').value = "";
            });
        })

        DOM.elid('is-registered').addEventListener('click', () => {
            let airlineAddress = DOM.elid('airline-fund-address').value;
            contract.isAirlineRegistered(airlineAddress, (error, result) => {
                displayTx('display-wrapper-register', [{ label: 'Is Airline registered', error: error, value: JSON.stringify(result) }]);
                DOM.elid('airline-fund-address').value = "";
            });
        })

        DOM.elid('is-funded').addEventListener('click', () => {
            let airlineAddress = DOM.elid('airline-fund-address').value;
            contract.isAirlineFunded(airlineAddress, (error, result) => {
                displayTx('display-wrapper-register', [{ label: 'Is Airline funded', error: error, value: JSON.stringify(result )}]);
                DOM.elid('airline-fund-address').value = "";
            });
        })

        DOM.elid('is-pending').addEventListener('click', () => {
            let airlineAddress = DOM.elid('airline-fund-address').value;
            contract.isAirlinePending(airlineAddress, (error, result) => {
                displayTx('display-wrapper-register', [{ label: 'Is Airline pending', error: error, value: JSON.stringify(result) }]);
                DOM.elid('airline-fund-address').value = "";
            });
        })



        DOM.elid('submit-buy').addEventListener('click', () => {
            let flightName = DOM.elid('flight-name').value;
            let airlineAddress = DOM.elid('insurence-airline-address').value;
            let flightTimestamp = DOM.elid('flight-timestamp').value;
            let insuredAmount = DOM.elid('insurence-amount').value;
            contract.buy(flightName, airlineAddress, flightTimestamp, insuredAmount, (error, result) => {
                displayTx('display-wrapper-buy', [{ label: 'Insurance purchased Tx', error: error, value: JSON.stringify(result) }]);
                DOM.elid('flight-name').value = "";
                DOM.elid('insurence-airline-address').value = "";
                DOM.elid('flight-timestamp').value = "";
                DOM.elid('insurence-amount').value = "";
            });
        })

        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flightName = DOM.elid('flight-name').value;
            let airlineAddress = DOM.elid('insurence-airline-address').value;
            let flightTimestamp = DOM.elid('flight-timestamp').value;
            contract.fetchFlightStatus(flightName, airlineAddress, flightTimestamp, (error, result) => {
                displayTx('display-wrapper-buy', [{ label: 'Fetch flight status', error: error, value: JSON.stringify("fetching complete") }]);
                DOM.elid('flight-name').value = "";
                DOM.elid('insurence-airline-address').value = "";
                DOM.elid('flight-timestamp').value = "";
                DOM.elid('insurence-amount').value = "";
            });
        })

        DOM.elid('check-balance').addEventListener('click', () => {
            let passengerAddress = contract.currentAccount; 
            contract.getPassengerCredit(passengerAddress, (error, result) => {
                displayTx('display-wrapper-passenger-detail', [{ label: 'Credit pending to withdraw', error: error, value: result + ' WEI' }]);
                DOM.elid('passanger-address').value = "";
            });
        });

        DOM.elid('withdraw-balance').addEventListener('click', () => {
            let passengerAddress = contract.currentAccount; 
            contract.withdrawCredit(passengerAddress, (error, result) => {
                displayTx('display-wrapper-passenger-detail', [{ label: 'Credit withdrawn', error: error, value: JSON.stringify(result) }]);
                DOM.elid('passanger-address').value = "";
            });
        });
    });

    document.addEventListener('DOMContentLoaded', (event) => {
    // Now it's safe to use DOM.elid because the DOM is fully loaded
    let checkBalanceBtn = DOM.elid('check-balance');
    if (checkBalanceBtn) {
        checkBalanceBtn.addEventListener('click', () => {
        });
    }

    let withdrawBalanceBtn = DOM.elid('withdraw-balance');
    if (withdrawBalanceBtn) {
        withdrawBalanceBtn.addEventListener('click', () => {
        });
    }
});

} catch (error) {
    console.error("Could not get accounts", error);
}
} else {
console.log('Please install MetaMask!');
}

})();



async function checkIfOwnerOrRegistered(contract, userAccount, web3) {
    try {
        let isOwner = userAccount === GANACHE_OWNER_ACCOUNT;
        let isRegisteredAirline = false;

        if (!isOwner) {
            isRegisteredAirline = await contract.isAirlineRegistered(userAccount); // Await the promise
        }

        return isOwner || isRegisteredAirline;
    } catch (error) {
        console.error("Error in checkIfOwnerOrRegistered:", error);
        return false;
    }
}

function displaySectionBasedOnRole(isOwnerOrRegistered) {
    let ownerSection = DOM.elid('owner-section');
    let userSection = DOM.elid('user-section');

    if (!ownerSection || !userSection) {
        console.error("UI sections not found.");
        return;
    }

    if (isOwnerOrRegistered) {
        ownerSection.style.display = 'block';
        userSection.style.display = 'none';
    } else {
        ownerSection.style.display = 'none';
        userSection.style.display = 'block';
    }
}
function display(id, title, description, results) {
    let displayDiv = DOM.elid(id);
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({ className: 'row' }));
        row.appendChild(DOM.div({ className: 'col-sm-4 field' }, result.label));
        row.appendChild(DOM.div({ className: 'col-sm-8 field-value' }, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}

function displayTx(id, results) {
    let displayDiv = DOM.elid(id);
    results.map((result) => {
        let row = displayDiv.appendChild(DOM.div({ className: 'row' }));
        row.appendChild(DOM.div({ className: 'col-sm-3 field' }, result.error ? result.label + " Error" : result.label));
        row.appendChild(DOM.div({ className: 'col-sm-9 field-value' }, result.error ? String(result.error) : String(result.value)));
        displayDiv.appendChild(row);
    })
}