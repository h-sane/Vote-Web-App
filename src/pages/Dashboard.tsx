import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { LogOut, Vote, CheckCircle, Clock } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { startAuthentication } from '@simplewebauthn/browser';
import CryptoJS from 'crypto-js';
import { biometricAuthenticate } from "@/hooks/useBiometric";
import VotingSection from "@/components/dashboard/VotingSection";

interface Candidate {
  id: string;
  name: string;
  election_id: string;
}

interface Election {
  id: string;
  name: string;
  created_at: string;
}

interface VoteCount {
  candidate_id: string;
  candidate_name: string;
  vote_count: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [elections, setElections] = useState<Election[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [voteCounts, setVoteCounts] = useState<VoteCount[]>([]);
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    checkUser();
    fetchElections();
  }, []);

  useEffect(() => {
    if (elections.length > 0) {
      fetchCandidates();
      checkVotingStatus();
      fetchVoteCounts();
    }
  }, [elections, user]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    setUser(session.user);
  };

  const fetchElections = async () => {
    const { data, error } = await supabase
      .from('elections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch elections",
        variant: "destructive",
      });
    } else {
      setElections(data || []);
    }
  };

  const fetchCandidates = async () => {
    if (elections.length === 0) return;

    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('election_id', elections[0].id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch candidates",
        variant: "destructive",
      });
    } else {
      setCandidates(data || []);
    }
  };

  const checkVotingStatus = async () => {
    if (!user || elections.length === 0) return;

    const { data, error } = await supabase.rpc('has_user_voted', {
      election_uuid: elections[0].id,
      user_uuid: user.id
    });

    if (error) {
      console.error('Error checking vote status:', error);
    } else {
      setHasVoted(data);
    }
  };

  const fetchVoteCounts = async () => {
    if (elections.length === 0) return;

    const { data, error } = await supabase.rpc('get_vote_counts', {
      election_uuid: elections[0].id
    });

    if (error) {
      console.error('Error fetching vote counts:', error);
    } else {
      setVoteCounts(data || []);
    }
  };

  // biometric authentication - only allow scanner, no fallback
  const handleBiometricAuthentication = async () => {
    setAuthenticating(true);
    try {
      // Enforce biometric authenticate via custom hook
      const hash = await biometricAuthenticate();
      return hash;
    } catch (error: any) {
      toast({
        title: "Fingerprint Authentication Failed",
        description: error.message || "Fingerprint scan was canceled or failed.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setAuthenticating(false);
    }
  };

  const handleVote = async () => {
    if (!selectedCandidate || !user || elections.length === 0) return;

    setLoading(true);
    try {
      // 1. Do biometric authentication!
      const scannedHash = await handleBiometricAuthentication();

      // 2. Fetch stored fingerprint hash for user from Supabase
      const { data: storedBiometric, error: biometricError } = await supabase
        .from('users_biometrics')
        .select('fingerprint_hash')
        .eq('user_id', user.id)
        .single();

      if (biometricError || !storedBiometric) {
        throw new Error('No biometric data found. Please register first.');
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
        election_id: elections[0].id,
        timestamp: new Date().toISOString()
      };

      const voteHash = await generateVoteHash(voteData);

      // Get previous hash for blockchain chain
      const { data: lastVote } = await supabase
        .from('votes')
        .select('vote_hash')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      const previousHash = lastVote?.vote_hash || '0';

      // Insert vote
      const { error } = await supabase
        .from('votes')
        .insert({
          voter_id: user.id,
          candidate_id: selectedCandidate,
          election_id: elections[0].id,
          vote_hash: voteHash,
          previous_hash: previousHash,
          timestamp: new Date().toISOString()
        });

      if (error) throw error;

      // Log audit event
      await supabase.rpc('log_audit_event', {
        _user_id: user.id,
        _action: 'VOTE_CAST',
        _details: {
          election_id: elections[0].id,
          candidate_id: selectedCandidate,
          vote_hash: voteHash
        }
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
    const crypto = await import('crypto-js');
    const dataString = JSON.stringify(voteData);
    return crypto.SHA256(dataString).toString();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Vote Secure Campus</h1>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Voting Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Vote className="w-5 h-5 mr-2" />
                Current Election
              </CardTitle>
              <CardDescription>
                {elections.length > 0 ? elections[0].name : 'No active elections'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VotingSection
                user={user}
                election={elections.length > 0 ? elections[0] : null}
                candidates={candidates}
                hasVoted={hasVoted}
                voteCounts={voteCounts}
                setHasVoted={setHasVoted}
                fetchVoteCounts={fetchVoteCounts}
              />
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle>Live Results</CardTitle>
              <CardDescription>Real-time vote counts from the blockchain</CardDescription>
            </CardHeader>
            <CardContent>
              {voteCounts.length > 0 ? (
                <div className="space-y-3">
                  {voteCounts.map((count) => (
                    <div key={count.candidate_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{count.candidate_name}</span>
                      <span className="text-lg font-bold text-blue-600">
                        {count.vote_count} votes
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">No votes cast yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
