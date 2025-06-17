import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, UserPlus, BarChart, Settings, Users } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface Candidate {
  id: string;
  name: string;
  election_id: string;
}

interface Election {
  id: string;
  name: string;
  created_at: string;
  created_by?: string | null;
}

interface VoteCount {
  candidate_id: string;
  candidate_name: string;
  vote_count: number;
}

interface UserProfile {
  id: string;
  full_name: string;
  roll_number: string;
  is_admin: boolean;
  created_at: string;
  user_id?: string; // for easy reference, if needed
}

const Admin = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elections, setElections] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [voteCounts, setVoteCounts] = useState([]);
  const [userProfiles, setUserProfiles] = useState([]);
  const [newCandidate, setNewCandidate] = useState('');
  const [newElection, setNewElection] = useState('');
  
  // Auth form state
  const [authForm, setAuthForm] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchElections();
      fetchUserProfiles();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (elections.length > 0) {
      fetchCandidates();
      fetchVoteCounts();
    }
  }, [elections]);

  const checkUser = async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Session fetch error", sessionError);
      toast({
        title: "Session Error",
        description: String(sessionError.message),
        variant: "destructive",
      });
      return;
    }
    if (session) {
      setUser(session.user);
      console.log("[checkUser] Session found, user:", session.user);
      await checkAdminStatus(session.user.id);
    } else {
      console.log("[checkUser] No session found.");
    }
  };

  const checkAdminStatus = async (userId: string) => {
    console.log("[checkAdminStatus] Checking admin for user:", userId);
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('is_admin, full_name, id, user_id, roll_number')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user profile for admin check:", error);
      toast({
        title: "Error checking admin status",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    console.log("[checkAdminStatus] Profile fetched from user_profiles:", profile);

    if (profile && profile.is_admin === true) {
      setIsAdmin(true);
      console.log("[checkAdminStatus] is_admin IS TRUE - admin access granted.");
      toast({
        title: "🟢 You are admin!",
        description: `Welcome, ${profile.full_name || "Admin"}`,
      });
    } else {
      setIsAdmin(false);
      console.warn("[checkAdminStatus] is_admin is FALSE OR profile missing.", profile);
      toast({
        title: "Access Denied",
        description: profile
          ? `is_admin: ${profile.is_admin}\nuser_id: ${profile.user_id}\nrow id: ${profile.id}`
          : "No user profile found for your account. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log("[Admin Login] Attempting signInWithPassword for", authForm.email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authForm.email,
        password: authForm.password,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        console.error("[Admin Login] signInWithPassword ERROR", error);
        setLoading(false);
        return;
      }

      if (data.user) {
        setUser(data.user);
        console.log("[Admin Login] User signed in:", data.user);

        // Debug the profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('is_admin, full_name, id, user_id, roll_number')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (profileError) {
          toast({
            title: "Profile Fetch Error",
            description: profileError.message,
            variant: "destructive",
          });
          console.error("[Admin Login] Profile fetch error:", profileError);
          await supabase.auth.signOut();
          setIsAdmin(false);
          setUser(null);
          setLoading(false);
          return;
        }

        console.log("[Admin Login] Profile lookup result:", profile);

        if (!profile) {
          toast({
            title: "Profile Missing ❗",
            description: "No user_profiles record for your account. Please contact support.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          setIsAdmin(false);
          setUser(null);
        } else if (!profile.is_admin) {
          toast({
            title: "Access denied.",
            description: `is_admin: ${profile.is_admin}\nuser_id: ${profile.user_id}\nrow id: ${profile.id}`,
            variant: "destructive",
          });
          await supabase.auth.signOut();
          setIsAdmin(false);
          setUser(null);
        } else {
          setIsAdmin(true);
          toast({
            title: "Admin Login Successful",
            description: `Welcome, ${profile.full_name || "Admin"}!`,
          });
        }
      } else {
        toast({
          title: "Unknown Error",
          description: "No user returned from Supabase. Please try again.",
          variant: "destructive",
        });
        setUser(null);
        setIsAdmin(false);
      }
    } catch (error) {
      toast({
        title: "Unknown Error",
        description: String(error),
        variant: "destructive",
      });
      console.error("[Admin Login] Unexpected error:", error);
    } finally {
      setLoading(false);
    }
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
      if (!data || data.length === 0) {
        toast({
          title: "No Elections Found",
          description: "No elections are present in the system.",
        });
        // Also log to console for debugging:
        console.log('fetchElections: Election data missing or empty:', data);
      }
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

  const fetchUserProfiles = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user profiles:', error);
    } else {
      setUserProfiles(data || []);
    }
  };

  const handleAddCandidate = async () => {
    if (!newCandidate.trim() || elections.length === 0) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('candidates')
        .insert({
          name: newCandidate.trim(),
          election_id: elections[0].id
        });

      if (error) throw error;

      toast({
        title: "Candidate Added",
        description: `${newCandidate} has been added to the election.`,
      });

      setNewCandidate('');
      fetchCandidates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateElection = async () => {
    if (!newElection.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('elections')
        .insert({
          name: newElection.trim(),
          created_by: user.id, // Set the creator/admin of the election
        });

      if (error) throw error;

      toast({
        title: "Election Created",
        description: `${newElection} has been created.`,
      });

      setNewElection('');
      fetchElections();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    navigate('/auth');
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">Admin Panel</CardTitle>
            <CardDescription>Vote Secure Campus Administration</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing In...' : 'Admin Login'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                Back to Voter Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="elections" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="elections" className="flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Elections
            </TabsTrigger>
            <TabsTrigger value="candidates" className="flex items-center">
              <UserPlus className="w-4 h-4 mr-2" />
              Candidates
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center">
              <BarChart className="w-4 h-4 mr-2" />
              Results
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="elections">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Election</CardTitle>
                  <CardDescription>Set up a new voting session</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="election-name">Election Name</Label>
                    <Input
                      id="election-name"
                      value={newElection}
                      onChange={(e) => setNewElection(e.target.value)}
                      placeholder="e.g., Student Council Election 2024"
                    />
                  </div>
                  <Button onClick={handleCreateElection} disabled={loading || !newElection.trim()}>
                    Create Election
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Current Elections</CardTitle>
                  <CardDescription>Manage existing elections</CardDescription>
                </CardHeader>
                <CardContent>
                  {elections.length > 0 ? (
                    <div className="space-y-2">
                      {elections.map((election) => (
                        <div key={election.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">{election.name}</h3>
                            <p className="text-sm text-gray-600">
                              Created: {new Date(election.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {/* (Optional) Show delete if admin/creator */}
                          {election.created_by === user?.id && (
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={async () => {
                                setLoading(true);
                                try {
                                  const { error } = await supabase
                                    .from('elections')
                                    .delete()
                                    .eq('id', election.id);

                                  if (error) throw error;

                                  toast({
                                    title: "Election Deleted",
                                    description: `${election.name} deleted.`,
                                  });
                                  fetchElections();
                                } catch (error: any) {
                                  toast({
                                    title: "Error",
                                    description: error.message,
                                    variant: "destructive",
                                  });
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              disabled={loading}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">No elections created yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="candidates">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Add Candidate</CardTitle>
                  <CardDescription>Add candidates to the current election</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="candidate-name">Candidate Name</Label>
                    <Input
                      id="candidate-name"
                      value={newCandidate}
                      onChange={(e) => setNewCandidate(e.target.value)}
                      placeholder="Enter candidate name"
                    />
                  </div>
                  <Button 
                    onClick={handleAddCandidate} 
                    disabled={loading || !newCandidate.trim() || elections.length === 0}
                  >
                    Add Candidate
                  </Button>
                  {elections.length === 0 && (
                    <p className="text-sm text-red-600">Create an election first.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Current Candidates</CardTitle>
                  <CardDescription>
                    {elections.length > 0 ? `For: ${elections[0].name}` : 'No active election'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {candidates.length > 0 ? (
                    <div className="space-y-2">
                      {candidates.map((candidate, index) => (
                        <div key={candidate.id} className="p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">{index + 1}. {candidate.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">No candidates added yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Live Election Results</CardTitle>
                <CardDescription>Real-time voting results from the blockchain</CardDescription>
              </CardHeader>
              <CardContent>
                {voteCounts.length > 0 ? (
                  <div className="space-y-4">
                    {voteCounts.map((count, index) => (
                      <div key={count.candidate_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                          <span className="font-medium text-lg">{count.candidate_name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-blue-600">{count.vote_count}</span>
                          <span className="text-gray-600 ml-1">votes</span>
                        </div>
                      </div>
                    ))}
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-medium text-blue-900">Total Votes Cast</h3>
                      <p className="text-2xl font-bold text-blue-600">
                        {voteCounts.reduce((sum, count) => sum + count.vote_count, 0)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-8">No votes cast yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Registered Users</CardTitle>
                <CardDescription>All users registered in the system</CardDescription>
              </CardHeader>
              <CardContent>
                {userProfiles.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Name</th>
                          <th className="text-left py-2">Roll Number</th>
                          <th className="text-left py-2">Admin</th>
                          <th className="text-left py-2">Registered</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userProfiles.map((profile) => (
                          <tr key={profile.id} className="border-b">
                            <td className="py-2">{profile.full_name}</td>
                            <td className="py-2">{profile.roll_number}</td>
                            <td className="py-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                profile.is_admin 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {profile.is_admin ? 'Admin' : 'User'}
                              </span>
                            </td>
                            <td className="py-2 text-sm text-gray-600">
                              {new Date(profile.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-8">No users registered yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
