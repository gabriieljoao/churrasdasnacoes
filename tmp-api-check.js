(async () => {
  const apiKey = '8d1d5b1e2918470bbace67df00cf6418';
  const res = await fetch('https://api.football-data.org/v4/competitions/BSA', {
    headers: { 'X-Auth-Token': apiKey }
  });
  const data = await res.json();
  console.log("Competition:", JSON.stringify(data, null, 2));

  const teamsRes = await fetch('https://api.football-data.org/v4/competitions/BSA/teams', {
    headers: { 'X-Auth-Token': apiKey }
  });
  const teamsData = await teamsRes.json();
  console.log("\nTeams[0]:", JSON.stringify(teamsData.teams?.[0], null, 2));

  const matchesRes = await fetch('https://api.football-data.org/v4/competitions/BSA/matches?matchday=1', {
    headers: { 'X-Auth-Token': apiKey }
  });
  const matchesData = await matchesRes.json();
  console.log("\nMatches[0]:", JSON.stringify(matchesData.matches?.[0], null, 2));
})();
