// ============================================================
// Shuttle Track — Google Apps Script
// Paste this entire file into Extensions > Apps Script
// then Deploy > New deployment > Web app > Anyone
// ============================================================

function doGet(e) {
  try {
    const result = handle(e.parameter.action, e.parameter, null);
    return out(result);
  } catch(err) { return out({ error: String(err) }); }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const result = handle(body.action, {}, body);
    return out(result);
  } catch(err) { return out({ error: String(err) }); }
}

function out(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet(name) {
  return ss().getSheetByName(name) || ss().insertSheet(name);
}

// Google Sheets auto-converts date-looking strings to Date objects on read.
// This normalises them back to "yyyy-MM-dd" strings so comparisons stay safe.
function padTwo(n) { return n < 10 ? '0' + n : '' + n; }
function normalizeCell(val) {
  if (val instanceof Date) {
    try {
      return Utilities.formatDate(val, ss().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
    } catch(e) {
      return val.getFullYear() + '-' + padTwo(val.getMonth()+1) + '-' + padTwo(val.getDate());
    }
  }
  return (val === null || val === undefined) ? '' : val;
}

function rows(name) {
  const v = sheet(name).getDataRange().getValues();
  return v.length <= 1 ? [] : v.slice(1)
    .filter(r => r[0] !== '' && r[0] !== undefined && r[0] !== null)
    .map(r => r.map(normalizeCell));
}

function uid() { return Utilities.getUuid(); }
function now() { return new Date().toISOString(); }

// ─── ROUTER ────────────────────────────────────────────────────────────────

function handle(action, p, b) {
  switch(action) {
    case 'setup':              return setup();
    case 'getPlayers':         return getPlayers();
    case 'getSessions':        return getSessions();
    case 'getSessionDetail':   return getSessionDetail(p.sessionId);
    case 'getStats':           return getStats();
    case 'createSession':      return createSession(b);
    case 'updateSession':      return updateSession(b.id, b);
    case 'deleteSession':      return deleteSession(b.id);
    case 'addSessionPlayer':   return addSessionPlayer(b.sessionId, b.playerId, b.playerName);
    case 'removeSessionPlayer':return removeSessionPlayer(b.sessionId, b.playerId);
    case 'addMatches':         return addMatches(b.sessionId, b.matches);
    case 'updateMatch':        return updateMatch(b.id, b);
    case 'deleteMatch':        return deleteMatch(b.id);
    default: throw new Error('Unknown action: ' + action);
  }
}

// ─── SETUP ─────────────────────────────────────────────────────────────────

function setup() {
  const defs = {
    players:         ['id','name','created_at'],
    sessions:        ['id','date','location','notes','status','created_at'],
    session_players: ['id','session_id','player_id','created_at'],
    matches:         ['id','session_id','match_number','court','status',
                      'team1_player1_id','team1_player2_id','team2_player1_id','team2_player2_id',
                      'team1_score','team2_score','winner_team','created_at'],
  };
  for (const [name, headers] of Object.entries(defs)) {
    const sh = sheet(name);
    if (sh.getRange(1,1).getValue() !== 'id') {
      sh.getRange(1,1,1,headers.length).setValues([headers])
        .setBackground('#16a34a').setFontColor('white').setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  }
  return { ok: true, message: 'Sheets initialized!' };
}

// ─── PLAYERS ───────────────────────────────────────────────────────────────

function getPlayers() {
  return rows('players').map(r => ({id:r[0],name:r[1],created_at:r[2]}))
    .sort((a,b) => a.name.localeCompare(b.name));
}

function findPlayerByName(name) {
  const r = rows('players').find(r => r[1].toLowerCase() === name.toLowerCase());
  return r ? {id:r[0],name:r[1],created_at:r[2]} : null;
}

function createPlayer(name) {
  const p = {id:uid(), name:name.trim(), created_at:now()};
  sheet('players').appendRow([p.id, p.name, p.created_at]);
  return p;
}

function getOrCreatePlayer(name) {
  return findPlayerByName(name) || createPlayer(name);
}

// ─── SESSIONS ──────────────────────────────────────────────────────────────

function getSessions() {
  return rows('sessions')
    .map(r => ({id:r[0],date:r[1],location:r[2]||'',notes:r[3]||'',status:r[4]||'active',created_at:r[5]}))
    .sort((a,b) => b.date.localeCompare(a.date));
}

function getSessionDetail(sessionId) {
  const sessionRow = rows('sessions').find(r => r[0] === sessionId);
  if (!sessionRow) return { error: 'Session not found' };
  const session = {id:sessionRow[0],date:sessionRow[1],location:sessionRow[2]||'',notes:sessionRow[3]||'',status:sessionRow[4]||'active',created_at:sessionRow[5]};

  const allPlayers = getPlayers();
  const playerMap = {};
  allPlayers.forEach(p => { playerMap[p.id] = p; });

  const playerIds = rows('session_players').filter(r => r[1] === sessionId).map(r => r[2]);
  const players = playerIds.map(id => playerMap[id]).filter(Boolean);

  const matchRows = rows('matches').filter(r => r[1] === sessionId);
  const matches = matchRows.map(r => toMatch(r, playerMap)).sort((a,b) => a.match_number - b.match_number);

  return { session, players, allPlayers, matches };
}

function createSession(data) {
  const session = {id:uid(), date:data.date, location:data.location||'', notes:data.notes||'', status:'active', created_at:now()};
  sheet('sessions').appendRow([session.id,session.date,session.location,session.notes,session.status,session.created_at]);

  const allIds = [...(data.playerIds||[])];
  for (const name of (data.newPlayerNames||[])) {
    allIds.push(getOrCreatePlayer(name).id);
  }
  for (const pid of allIds) _addSessionPlayer(session.id, pid);

  const allPlayers = getPlayers();
  return { session, players: allPlayers.filter(p => allIds.includes(p.id)) };
}

function updateSession(id, data) {
  const sh = sheet('sessions');
  const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (v[i][0] === id) {
      if (data.status) sh.getRange(i+1, 5).setValue(data.status);
      return { ok: true };
    }
  }
  return { ok: false };
}

function deleteSession(id) {
  deleteRowsWhere('matches', r => r[1] === id);
  deleteRowsWhere('session_players', r => r[1] === id);
  deleteRowById('sessions', id);
  return { ok: true };
}

// ─── SESSION PLAYERS ───────────────────────────────────────────────────────

function _addSessionPlayer(sessionId, playerId) {
  const exists = rows('session_players').some(r => r[1]===sessionId && r[2]===playerId);
  if (!exists) sheet('session_players').appendRow([uid(), sessionId, playerId, now()]);
}

function addSessionPlayer(sessionId, playerId, playerName) {
  let pid = playerId;
  if (!pid && playerName) pid = getOrCreatePlayer(playerName).id;
  if (!pid) return { error: 'No player specified' };
  _addSessionPlayer(sessionId, pid);
  const p = rows('players').find(r => r[0] === pid);
  return p ? {id:p[0],name:p[1],created_at:p[2]} : { id: pid };
}

function removeSessionPlayer(sessionId, playerId) {
  const sh = sheet('session_players');
  const v = sh.getDataRange().getValues();
  for (let i = v.length-1; i >= 1; i--) {
    if (v[i][1]===sessionId && v[i][2]===playerId) { sh.deleteRow(i+1); return {ok:true}; }
  }
  return { ok: false };
}

// ─── MATCHES ───────────────────────────────────────────────────────────────

function toMatch(r, playerMap) {
  playerMap = playerMap || {};
  const p = function(id) { return playerMap[id] || null; };
  return {
    id:r[0], session_id:r[1], match_number:parseInt(r[2])||0, court:r[3]||'', status:r[4]||'pending',
    team1_player1_id:r[5]||null, team1_player2_id:r[6]||null,
    team2_player1_id:r[7]||null, team2_player2_id:r[8]||null,
    team1_score: r[9]!==''&&r[9]!==undefined ? parseInt(r[9]) : null,
    team2_score: r[10]!==''&&r[10]!==undefined ? parseInt(r[10]) : null,
    winner_team: r[11]!==''&&r[11]!==undefined ? parseInt(r[11]) : null,
    created_at: r[12]||'',
    team1_player1: p(r[5]), team1_player2: p(r[6]),
    team2_player1: p(r[7]), team2_player2: p(r[8]),
  };
}

function addMatches(sessionId, matches) {
  const sh = sheet('matches');
  for (const m of matches) {
    sh.appendRow([uid(),sessionId,m.match_number,m.court,m.status||'pending',
      m.team1_player1_id||'',m.team1_player2_id||'',m.team2_player1_id||'',m.team2_player2_id||'',
      m.team1_score!==null&&m.team1_score!==undefined?m.team1_score:'',
      m.team2_score!==null&&m.team2_score!==undefined?m.team2_score:'',
      m.winner_team!==null&&m.winner_team!==undefined?m.winner_team:'',
      now()]);
  }
  return { count: matches.length };
}

function updateMatch(id, data) {
  const sh = sheet('matches');
  const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (v[i][0] === id) {
      if ('team1_score' in data) sh.getRange(i+1,10).setValue(data.team1_score!==null?data.team1_score:'');
      if ('team2_score' in data) sh.getRange(i+1,11).setValue(data.team2_score!==null?data.team2_score:'');
      if ('winner_team' in data) sh.getRange(i+1,12).setValue(data.winner_team!==null?data.winner_team:'');
      if (data.status) sh.getRange(i+1,5).setValue(data.status);
      return { ok: true };
    }
  }
  return { ok: false };
}

function deleteMatch(id) { deleteRowById('matches', id); return { ok: true }; }

// ─── STATS ─────────────────────────────────────────────────────────────────

function getStats() {
  const sessions = getSessions();
  const players = getPlayers();
  const completed = rows('matches').filter(r => r[4]==='completed').map(r => toMatch(r));
  const winMap = {};
  completed.forEach(function(m) {
    var t1 = [m.team1_player1_id,m.team1_player2_id].filter(Boolean);
    var t2 = [m.team2_player1_id,m.team2_player2_id].filter(Boolean);
    if (m.winner_team===1) t1.forEach(function(id){ winMap[id]=(winMap[id]||0)+1; });
    if (m.winner_team===2) t2.forEach(function(id){ winMap[id]=(winMap[id]||0)+1; });
  });
  var topId=null, maxW=0;
  Object.entries(winMap).forEach(function([id,w]){ if(w>maxW){maxW=w;topId=id;} });
  return {
    totalSessions: sessions.length,
    totalPlayers: players.length,
    totalMatches: completed.length,
    recentSessions: sessions.slice(0,5),
    topPlayer: players.find(function(p){return p.id===topId;})||null,
  };
}

// ─── HELPERS ───────────────────────────────────────────────────────────────

function deleteRowById(sheetName, id) {
  const sh = sheet(sheetName);
  const v = sh.getDataRange().getValues();
  for (let i = v.length-1; i >= 1; i--) {
    if (v[i][0] === id) { sh.deleteRow(i+1); return true; }
  }
  return false;
}

function deleteRowsWhere(sheetName, pred) {
  const sh = sheet(sheetName);
  const v = sh.getDataRange().getValues();
  for (let i = v.length-1; i >= 1; i--) {
    if (pred(v[i])) sh.deleteRow(i+1);
  }
}
