
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Vote } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { biometricAuthenticate } from "@/hooks/useBiometric";
import { supabase } from "@/integrations/supabase/client";

interface Candidate {
  id: string;
  name: string;
  election_id: string;
}

interface VoteCount {
  candidate_id: string;
  candidate_name: string;
  vote_count: number;
}

interface Props {
  user: any;
  election: any;
  candidates: Candidate[];
  hasVoted: boolean;
  voteCounts: VoteCount[];
  setHasVoted: (v: boolean) => void;
  fetchVoteCounts: () => void;
}

const VotingSection: React.FC<Props> = ({
  user,
  election,
  candidates,
  hasVoted,
  voteCounts,
  setHasVoted,
  fetchVoteCounts,
}) => {
  const [selectedCandidate, setSelectedCandidate] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleVote = async () => {
    if (!selectedCandidate || !user || !election) return;

    setLoading(true);
    try {
      // 1. Do biometric authentication!
      const scannedHash = await biometricAuthenticate();

      // 2. Fetch stored fingerprint hash for user from Supabase
      const { data: storedBiometric, error: biometricError } = await supabase
        .from("users_biometrics")
        .select("fingerprint_hash")
        .eq("user_id", user.id)
        .single();

      if (biometricError || !storedBiometric) {
        throw new Error("No biometric data found. Please register first.");
      }

      if (storedBiometric.fingerprint_hash !== scannedHash) {
        toast({
          title: "Fingerprint Authentication Failed",
          description: "Scanned fingerprint does not match registered fingerprint. Voting denied.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Generate blockchain-style vote hash
      const voteData = {
        voter_id: user.id,
        candidate_id: selectedCandidate,
        election_id: election.id,
        timestamp: new Date().toISOString(),
      };

      const voteHash = await generateVoteHash(voteData);

      // Get previous hash for blockchain chain
      const { data: lastVote } = await supabase
        .from("votes")
        .select("vote_hash")
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      const previousHash = lastVote?.vote_hash || "0";

      // Insert vote
      const { error } = await supabase
        .from("votes")
        .insert({
          voter_id: user.id,
          candidate_id: selectedCandidate,
          election_id: election.id,
          vote_hash: voteHash,
          previous_hash: previousHash,
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;

      // Log audit event
      await supabase.rpc("log_audit_event", {
        _user_id: user.id,
        _action: "VOTE_CAST",
        _details: {
          election_id: election.id,
          candidate_id: selectedCandidate,
          vote_hash: voteHash,
        },
      });

      toast({
        title: "Vote Cast Successfully!",
        description: "Your vote has been recorded on the blockchain.",
      });

      setHasVoted(true);
      fetchVoteCounts();
    } catch (error: any) {
      toast({
        title: "Voting Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateVoteHash = async (voteData: any) => {
    const crypto = await import("crypto-js");
    const dataString = JSON.stringify(voteData);
    return crypto.SHA256(dataString).toString();
  };

  if (hasVoted) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Vote Cast Successfully!
        </h3>
        <p className="text-gray-600">
          Your vote has been recorded securely on the blockchain.
        </p>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No candidates available for voting.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-900 mb-3">Select a candidate:</h3>
      {candidates.map((candidate) => (
        <div key={candidate.id} className="flex items-center space-x-3">
          <input
            type="radio"
            id={candidate.id}
            name="candidate"
            value={candidate.id}
            onChange={(e) => setSelectedCandidate(e.target.value)}
            className="h-4 w-4 text-blue-600"
          />
          <label htmlFor={candidate.id} className="text-gray-700">
            {candidate.name}
          </label>
        </div>
      ))}
      <Button
        onClick={handleVote}
        disabled={!selectedCandidate || loading}
        className="w-full mt-4"
      >
        {loading ? "Casting Vote..." : "Cast Vote"}
      </Button>
    </div>
  );
};

export default VotingSection;
