// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract OpenInsureApp is ReentrancyGuard {

    // Flight status codes
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    uint256 private constant AIRLINE_FUNDING_REQUIREMENT_AMOUNT = 10 ether;
    uint256 private constant MAX_INSURANCE_AMOUNT = 1 ether;

    // Account used to deploy contract
    address private contractOwner;
    IOpenInsureData private openInsureData;


    modifier requireIsOperational() {
        // Modify to call data contract's status
        require(
            openInsureData.isOperational(),
            "Contract is currently not operational"
        );
        _; // All modifiers require an "_" which indicates where the function body will be added
    }


    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    constructor(address dataContractAddress) {
        contractOwner = msg.sender;
        openInsureData = IOpenInsureData(dataContractAddress);
        _registerAirline("Little Duck Airlines", contractOwner);
    }

    // Checks whether Contract is deployed
    function isOperational() public pure returns (bool) {
        return true; // Modify to call data contract's status
    }

// Adds Airline to the Queue
    function registerAirline(
        string memory name,
        address airlineAddress
    ) external requireIsOperational returns (bool) {
        require(
            openInsureData.isAirlineRegistered(msg.sender),
            "Sender is not an registered airline"
        );
        require(
            openInsureData.isAirlineFunded(msg.sender),
            "It is not possible to register the airline, the sender is not funded"
        );
        require(
            !openInsureData.isAirlineRegistered(airlineAddress),
            "The airline is already registered"
        );
        require(
            !openInsureData.isAirlinePending(airlineAddress),
            "Airline is already waiting for registration consensus"
        );

    // Implementing the Consensus where Registration of more than four accounts
        if (openInsureData.getRegisteredAirlineCounter() < 4) {
            _registerAirline(name, airlineAddress);
            return (true);
        }
        openInsureData.addPendingAirline(name, airlineAddress);
        return (false);
    }

    function _registerAirline(
        string memory airlineName,
        address airlineAddress
    ) private {
        openInsureData.registerAirline(airlineName, airlineAddress);
    }

    function isAirlineRegistered(
        address airlineAddress
    ) external view requireIsOperational returns (bool) {
        return openInsureData.isAirlineRegistered(airlineAddress);
    }

    function isAirlineFunded(
        address airlineAddress
    ) external view requireIsOperational returns (bool) {
        return openInsureData.isAirlineFunded(airlineAddress);
    }

    function isAirlinePending(
        address airlineAddress
    ) external view requireIsOperational returns (bool) {
        return openInsureData.isAirlinePending(airlineAddress);
    }

    function getPassengerCredit(
        address insuredPassenger
    ) external view requireIsOperational returns (uint256) {
        return openInsureData.getPassengerCredit(insuredPassenger);
    }

    function voteForAirline(
        address airlineAddress
    ) external requireIsOperational returns (uint256) {
        require(
            openInsureData.isAirlineRegistered(msg.sender),
            "Sender is not an registered airline"
        );
        require(
            openInsureData.isAirlineFunded(msg.sender),
            "It is not possible to vote, the sender is not funded"
        );
        require(
            openInsureData.isAirlinePending(airlineAddress),
            "Airline is not pending. Voting is not required"
        );
        uint256 voteCounter = openInsureData.voteForAirline(airlineAddress);
        return (voteCounter);
    }

    function fundAirline(
        address airlineAddress
    ) external payable requireIsOperational nonReentrant() {
        require(
            openInsureData.isAirlineRegistered(airlineAddress),
            "The Airline to be funded is not registered"
        );
        require(
            openInsureData.isAirlineFunded(airlineAddress) == false,
            "Airline is already funded"
        );
        require(
            msg.value >= AIRLINE_FUNDING_REQUIREMENT_AMOUNT,
            "Airline can not be funded, Ether amount is not enough"
        );
        openInsureData.fundAirline{value: msg.value}(
            airlineAddress,
            msg.value
        );
    }

    function buy(
        string memory flightName,
        address airlineAddress,
        uint256 timestamp
    ) external payable requireIsOperational nonReentrant() {
        require(
            openInsureData.isAirlineRegistered(airlineAddress),
            "Airline is not registered"
        );
        require(
            openInsureData.isAirlineFunded(airlineAddress),
            "Airline is not funded"
        );
        require(
            msg.value <= MAX_INSURANCE_AMOUNT,
            "Insured amount must be 1 ether or less"
        );
        bytes32 flightKey = getFlightKey(airlineAddress, flightName, timestamp);
        openInsureData.buy{value: msg.value}(
            flightKey,
            msg.sender,
            msg.value
        );
    }

    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) internal {
        if (statusCode == STATUS_CODE_LATE_AIRLINE) {
            bytes32 flightKey = getFlightKey(airline, flight, timestamp);
            openInsureData.creditInsurees(flightKey);
        }
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp
    ) external {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );

        // Instead of trying to assign a new struct directly to a mapping, initialize the necessary fields individually
        oracleResponses[key].requester = msg.sender;
        oracleResponses[key].isOpen = true;
        // The mapping inside 'responses' is automatically initialized
        emit OracleRequest(index, airline, flight, timestamp);
    }

    function withdrawCredit(address pessangerAddress) external nonReentrant() {
        require(pessangerAddress != address(0), "Provide valid address");
        openInsureData.pay(pessangerAddress);
    }

    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    function getRegistrationFee() public pure returns (uint256) {
        return REGISTRATION_FEE;
    }

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses; // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Each time a oracle submits a response
    event FlightStatusInfo(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    event OracleReport(
        address airline,
        string flight,
        uint256 timestamp,
        uint8 status
    );

    // Checks event index match and submit response based on data
    event OracleRequest(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp
    );

    // Register an oracle with the contract
    function registerOracle() external payable  {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");
        uint8[3] memory indexes = generateIndexes(msg.sender);
        oracles[msg.sender] = Oracle({isRegistered: true, indexes: indexes});
    }

    function getMyIndexes() external view returns (uint8[3] memory) {
        require(
            oracles[msg.sender].isRegistered,
            "Not registered as an oracle"
        );
        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) external {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
                (oracles[msg.sender].indexes[1] == index) ||
                (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );

        bytes32 key = keccak256(
            abi.encodePacked(index, airline, flight, timestamp)
        );
        require(
            oracleResponses[key].isOpen,
            "Flight or timestamp do not match oracle request"
        );

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (
            oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES
        ) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(
        address account
    ) internal returns (uint8[3] memory) {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }
        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;
        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(
            uint256(
                keccak256(
                    abi.encodePacked(blockhash(block.number - nonce++), account)
                )
            ) % maxValue
        );
        if (nonce > 250) {
            nonce = 0; // Can only fetch blockhashes for last 256 blocks so we adapt
        }
        return random;
    }

}

abstract contract IOpenInsureData {
    function isOperational() public view virtual returns (bool);

    function isAirlineRegistered(
        address airline
    ) external view virtual returns (bool);

    function isAirlineFunded(
        address airline
    ) external view virtual returns (bool);

    function isAirlinePending(
        address airline
    ) external view virtual returns (bool);

    function getRegisteredAirlineCounter()
        public
        view
        virtual
        returns (uint256);

    function registerAirline(
        string memory name,
        address airlineAddress
    ) external virtual;

    function addPendingAirline(
        string memory name,
        address airlineAddress
    ) external virtual;

    function voteForAirline(
        address airlineAddress
    ) external virtual returns (uint256);

    function fundAirline(
        address airlineAddress,
        uint256 amount
    ) external payable virtual;

    function buy(
        bytes32 flightKey,
        address passengerAddress,
        uint256 insuredAmount
    ) external payable virtual;

    function creditInsurees(bytes32 flightKey) external virtual;

    function pay(address passengerAddress) external payable virtual;

    function getPassengerCredit(
        address passangerAddress
    ) external view virtual returns (uint256);
}