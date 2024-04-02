// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract OpenInsureData is ReentrancyGuard {
    struct Airline {
        string name;
        address airlineAddress;
        bool isFunded;
        uint256 voteCounter;
    }
    mapping(address => Airline) private registeredAirlines;
    mapping(address => Airline) private pendingAirlines;

    struct Passenger {
        address passengerAddress;
        mapping(bytes32 => uint256) insuredFlights;
        uint256 credit;
    }
    mapping(address => Passenger) private passengers;
    address[] public passengerAddresses;

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false

    uint256 registeredAirlineCounter = 0;
    uint256 totalFunds = 0;

    mapping(address => bool) private authorizedAppContracts;

// Deploy Contract as Contract Owner
     constructor() {
        contractOwner = msg.sender;
    }

// Modifier for only when Contract is operational
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

// Only Contract Owner modifier
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

// Checks Operational Status
    function isOperational() public view returns (bool) {
        return operational;
    }

// Sets Operational Status
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    function isAirlineRegistered(address airline) external view returns (bool) {
        return registeredAirlines[airline].airlineAddress != address(0);
    }

    function isAirlinePending(address airline) external view returns (bool) {
        return pendingAirlines[airline].airlineAddress != address(0);
    }

    function getRegisteredAirlineCounter() external view returns (uint256) {
        return registeredAirlineCounter;
    }

    function isAirlineFunded(address airline) external view returns (bool) {
        return registeredAirlines[airline].isFunded;
    }

    function getPassengerCredit(address insuredPassenger)
        external
        view
        returns (uint256)
    {
        return passengers[insuredPassenger].credit;
    }

    function registerAirline  (string memory name, address airlineAddress)
        public
        requireIsOperational
    {
        registeredAirlines[airlineAddress] = Airline({
            name: name,
            airlineAddress: airlineAddress,
            isFunded: false,
            voteCounter: 0
        });

        registeredAirlineCounter += 1;
    }

    function addPendingAirline(string calldata name, address airlineAddress)
        external
        requireIsOperational
    {
        pendingAirlines[airlineAddress] = Airline({
            name: name,
            airlineAddress: airlineAddress,
            isFunded: false,
            voteCounter: 1
        });
    }

    function voteForAirline(address airlineAddress)
        external
        requireIsOperational
        returns (uint256)
    {
        pendingAirlines[airlineAddress].voteCounter =
            pendingAirlines[airlineAddress].voteCounter +
            1;
        if (
            pendingAirlines[airlineAddress].voteCounter >=
            registeredAirlineCounter / 2
        ) {
            registerAirline(
                pendingAirlines[airlineAddress].name,
                airlineAddress
            );
            delete pendingAirlines[airlineAddress];
        }
        return pendingAirlines[airlineAddress].voteCounter;
    }

    function fundAirline(address airlineAddress, uint256 amount)
        external
        payable
        requireIsOperational
        nonReentrant()
    {
        registeredAirlines[airlineAddress].isFunded = true;
        totalFunds = totalFunds + amount;
    }

    function buy(
        bytes32 flightKey,
        address passengerAddress,
        uint256 insuredAmount
    ) external payable requireIsOperational nonReentrant() {
        if (passengers[passengerAddress].passengerAddress != address(0)) {
            // Existing insured passenger
            require(
                passengers[passengerAddress].insuredFlights[flightKey] == 0,
                "This flight is already insured"
            );
        } else {
            // New insured passenger
            Passenger storage newPassenger = passengers[passengerAddress];
            newPassenger.passengerAddress = passengerAddress;
            newPassenger.credit = 0; // Assuming you want to start with 0 credit for new passengers
            passengerAddresses.push(passengerAddress);
        }
        passengers[passengerAddress].insuredFlights[flightKey] = insuredAmount;
        totalFunds = totalFunds + insuredAmount; // Using '+' instead of '.add()' as per Solidity 0.8 and above
    }

    function creditInsurees(bytes32 flightKey) external requireIsOperational nonReentrant() {
        for (uint256 i = 0; i < passengerAddresses.length; i++) {
            if (
                passengers[passengerAddresses[i]].insuredFlights[flightKey] != 0
            ) {
                // Insured flights
                uint256 payedPrice = passengers[passengerAddresses[i]]
                    .insuredFlights[flightKey];
                uint256 savedCredit = passengers[passengerAddresses[i]].credit;
                passengers[passengerAddresses[i]].insuredFlights[flightKey] = 0;
                passengers[passengerAddresses[i]].credit =
                    savedCredit +
                    payedPrice +
                    (payedPrice / 2); // 1.5X the amount they paid
            }
        }
    }

// Pay out function to insured passenger
    function pay(address insuredPassenger)
        external
        payable
        requireIsOperational
        nonReentrant()
    {
        require(
            passengers[insuredPassenger].passengerAddress != address(0),
            "The passenger is not insured"
        );
        require(
            passengers[insuredPassenger].credit > 0,
            "There is not credit pending to be withdrawed for the passenger"
        );
        uint256 credit = passengers[insuredPassenger].credit;
        require(
            address(this).balance >= credit,
            "The contract does not have enough funds to pay the credit"
        );
        passengers[insuredPassenger].credit = 0;

        // Cast the `address` to `address payable`
        address payable payableInsuredPassenger = payable(insuredPassenger);
        payableInsuredPassenger.transfer(credit);
    }

    function authorizeCaller(address appContract) public {
        authorizedAppContracts[appContract] = true;
    }

    function fund() public payable {}

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    receive() external payable {
        fund();
    }

    // Optionally, if you need a generic fallback function
    fallback() external payable {
        // custom logic or call fund();
    }
}