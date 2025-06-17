
import { ethers } from 'ethers';

// Contract ABI (simplified for demo)
const VOTING_CONTRACT_ABI = [
  "function vote(uint256 _electionId, uint256 _candidateId, string _voteHash, string _previousHash) public",
  "function hasVoted(uint256 _electionId, address _voter) public view returns (bool)",
  "function getElectionResults(uint256 _electionId) public view returns (string[] memory, uint256[] memory)",
  "function authorizeVoter(address _voter, string _rollNumber) public",
  "event VoteCast(uint256 indexed electionId, address indexed voter, uint256 candidateId, string voteHash)"
];

// For demo purposes - in production, this would be deployed to testnet/mainnet
const CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890"; // Placeholder

export class BlockchainService {
  private provider: ethers.BrowserProvider | null = null;
  private contract: ethers.Contract | null = null;
  private signer: ethers.Signer | null = null;

  async initialize() {
    try {
      // Check if MetaMask is installed
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        this.provider = new ethers.BrowserProvider((window as any).ethereum);
        await this.provider.send("eth_requestAccounts", []);
        this.signer = await this.provider.getSigner();
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, VOTING_CONTRACT_ABI, this.signer);
        return true;
      } else {
        console.log('MetaMask not found - using simulation mode');
        return false;
      }
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      return false;
    }
  }

  async castVote(electionId: number, candidateId: number, voteHash: string, previousHash: string) {
    try {
      if (!this.contract) {
        // Simulation mode - return success
        console.log('Simulating blockchain vote cast:', { electionId, candidateId, voteHash });
        return {
          hash: `0x${Math.random().toString(16).substr(2, 64)}`,
          success: true,
          simulated: true
        };
      }

      const tx = await this.contract.vote(electionId, candidateId, voteHash, previousHash);
      const receipt = await tx.wait();
      
      return {
        hash: receipt.transactionHash,
        success: true,
        simulated: false
      };
    } catch (error) {
      console.error('Blockchain vote failed:', error);
      throw new Error('Failed to record vote on blockchain');
    }
  }

  async hasUserVoted(electionId: number, userAddress: string): Promise<boolean> {
    try {
      if (!this.contract) {
        // Simulation mode - return false for demo
        return false;
      }

      return await this.contract.hasVoted(electionId, userAddress);
    } catch (error) {
      console.error('Failed to check voting status:', error);
      return false;
    }
  }

  async getElectionResults(electionId: number) {
    try {
      if (!this.contract) {
        // Simulation mode - return mock data
        return {
          candidateNames: ['Alice Johnson', 'Bob Smith', 'Carol Davis'],
          voteCounts: [25, 18, 12],
          simulated: true
        };
      }

      const [candidateNames, voteCounts] = await this.contract.getElectionResults(electionId);
      return {
        candidateNames,
        voteCounts: voteCounts.map((count: any) => Number(count)),
        simulated: false
      };
    } catch (error) {
      console.error('Failed to get election results:', error);
      throw new Error('Failed to fetch results from blockchain');
    }
  }

  async getUserAddress(): Promise<string | null> {
    try {
      if (!this.signer) {
        return null;
      }
      return await this.signer.getAddress();
    } catch (error) {
      console.error('Failed to get user address:', error);
      return null;
    }
  }

  isSimulationMode(): boolean {
    return !this.contract;
  }
}

export const blockchainService = new BlockchainService();
