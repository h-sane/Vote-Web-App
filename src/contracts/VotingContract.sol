
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VoteSecureCampus {
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
        bool exists;
    }
    
    struct Vote {
        address voter;
        uint256 candidateId;
        uint256 timestamp;
        string voteHash;
        string previousHash;
    }
    
    struct Election {
        uint256 id;
        string name;
        bool isActive;
        uint256 startTime;
        uint256 endTime;
        uint256 candidateCount;
        mapping(uint256 => Candidate) candidates;
        mapping(address => bool) hasVoted;
        Vote[] votes;
    }
    
    mapping(uint256 => Election) public elections;
    mapping(address => bool) public authorizedVoters;
    mapping(string => address) public rollNumberToAddress;
    
    uint256 public electionCount;
    address public admin;
    
    event ElectionCreated(uint256 indexed electionId, string name);
    event CandidateAdded(uint256 indexed electionId, uint256 candidateId, string name);
    event VoteCast(uint256 indexed electionId, address indexed voter, uint256 candidateId, string voteHash);
    event VoterAuthorized(address voter, string rollNumber);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyAuthorizedVoter() {
        require(authorizedVoters[msg.sender], "You are not authorized to vote");
        _;
    }
    
    modifier electionExists(uint256 _electionId) {
        require(_electionId < electionCount, "Election does not exist");
        _;
    }
    
    modifier electionActive(uint256 _electionId) {
        Election storage election = elections[_electionId];
        require(election.isActive, "Election is not active");
        require(block.timestamp >= election.startTime, "Election has not started yet");
        require(block.timestamp <= election.endTime, "Election has ended");
        _;
    }
    
    constructor() {
        admin = msg.sender;
        electionCount = 0;
    }
    
    function authorizeVoter(address _voter, string memory _rollNumber) public onlyAdmin {
        authorizedVoters[_voter] = true;
        rollNumberToAddress[_rollNumber] = _voter;
        emit VoterAuthorized(_voter, _rollNumber);
    }
    
    function createElection(
        string memory _name,
        uint256 _startTime,
        uint256 _endTime
    ) public onlyAdmin returns (uint256) {
        require(_endTime > _startTime, "End time must be after start time");
        require(_startTime > block.timestamp, "Start time must be in the future");
        
        Election storage newElection = elections[electionCount];
        newElection.id = electionCount;
        newElection.name = _name;
        newElection.isActive = true;
        newElection.startTime = _startTime;
        newElection.endTime = _endTime;
        newElection.candidateCount = 0;
        
        emit ElectionCreated(electionCount, _name);
        electionCount++;
        
        return electionCount - 1;
    }
    
    function addCandidate(
        uint256 _electionId,
        string memory _name
    ) public onlyAdmin electionExists(_electionId) {
        Election storage election = elections[_electionId];
        uint256 candidateId = election.candidateCount;
        
        election.candidates[candidateId] = Candidate({
            id: candidateId,
            name: _name,
            voteCount: 0,
            exists: true
        });
        
        election.candidateCount++;
        emit CandidateAdded(_electionId, candidateId, _name);
    }
    
    function vote(
        uint256 _electionId,
        uint256 _candidateId,
        string memory _voteHash,
        string memory _previousHash
    ) public onlyAuthorizedVoter electionExists(_electionId) electionActive(_electionId) {
        Election storage election = elections[_electionId];
        
        require(!election.hasVoted[msg.sender], "You have already voted in this election");
        require(election.candidates[_candidateId].exists, "Candidate does not exist");
        
        // Mark voter as having voted
        election.hasVoted[msg.sender] = true;
        
        // Increment candidate vote count
        election.candidates[_candidateId].voteCount++;
        
        // Record the vote in blockchain
        Vote memory newVote = Vote({
            voter: msg.sender,
            candidateId: _candidateId,
            timestamp: block.timestamp,
            voteHash: _voteHash,
            previousHash: _previousHash
        });
        
        election.votes.push(newVote);
        
        emit VoteCast(_electionId, msg.sender, _candidateId, _voteHash);
    }
    
    function hasVoted(uint256 _electionId, address _voter) 
        public view electionExists(_electionId) returns (bool) {
        return elections[_electionId].hasVoted[_voter];
    }
    
    function getCandidate(uint256 _electionId, uint256 _candidateId) 
        public view electionExists(_electionId) returns (string memory name, uint256 voteCount) {
        Election storage election = elections[_electionId];
        require(election.candidates[_candidateId].exists, "Candidate does not exist");
        
        Candidate storage candidate = election.candidates[_candidateId];
        return (candidate.name, candidate.voteCount);
    }
    
    function getElectionResults(uint256 _electionId) 
        public view electionExists(_electionId) returns (
            string[] memory candidateNames,
            uint256[] memory voteCounts
        ) {
        Election storage election = elections[_electionId];
        
        candidateNames = new string[](election.candidateCount);
        voteCounts = new uint256[](election.candidateCount);
        
        for (uint256 i = 0; i < election.candidateCount; i++) {
            if (election.candidates[i].exists) {
                candidateNames[i] = election.candidates[i].name;
                voteCounts[i] = election.candidates[i].voteCount;
            }
        }
        
        return (candidateNames, voteCounts);
    }
    
    function getTotalVotes(uint256 _electionId) 
        public view electionExists(_electionId) returns (uint256) {
        Election storage election = elections[_electionId];
        uint256 totalVotes = 0;
        
        for (uint256 i = 0; i < election.candidateCount; i++) {
            if (election.candidates[i].exists) {
                totalVotes += election.candidates[i].voteCount;
            }
        }
        
        return totalVotes;
    }
    
    function getElectionInfo(uint256 _electionId) 
        public view electionExists(_electionId) returns (
            string memory name,
            bool isActive,
            uint256 startTime,
            uint256 endTime,
            uint256 candidateCount
        ) {
        Election storage election = elections[_electionId];
        return (
            election.name,
            election.isActive,
            election.startTime,
            election.endTime,
            election.candidateCount
        );
    }
    
    function endElection(uint256 _electionId) public onlyAdmin electionExists(_electionId) {
        elections[_electionId].isActive = false;
    }
    
    function getVoteHistory(uint256 _electionId) 
        public view electionExists(_electionId) returns (
            address[] memory voters,
            uint256[] memory candidateIds,
            uint256[] memory timestamps,
            string[] memory voteHashes
        ) {
        Election storage election = elections[_electionId];
        uint256 voteCount = election.votes.length;
        
        voters = new address[](voteCount);
        candidateIds = new uint256[](voteCount);
        timestamps = new uint256[](voteCount);
        voteHashes = new string[](voteCount);
        
        for (uint256 i = 0; i < voteCount; i++) {
            Vote storage voteRecord = election.votes[i];
            voters[i] = voteRecord.voter;
            candidateIds[i] = voteRecord.candidateId;
            timestamps[i] = voteRecord.timestamp;
            voteHashes[i] = voteRecord.voteHash;
        }
        
        return (voters, candidateIds, timestamps, voteHashes);
    }
}
