import { google } from "googleapis";
import { randomUUID } from "crypto";
import { Player, Session, Match } from "./types";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;

function getClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!;
  let credentials: object;
  try {
    credentials = JSON.parse(raw);
  } catch {
    credentials = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// ── Low-level helpers ─────────────────────────────────────────────────────────

async function getRows(sheet: string): Promise<string[][]> {
  const client = getClient();
  const res = await client.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A:Z`,
  });
  const rows = (res.data.values ?? []) as string[][];
  return rows.slice(1); // skip header row
}

async function appendRow(
  sheet: string,
  values: (string | number | null | undefined)[]
): Promise<void> {
  const client = getClient();
  await client.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [values.map((v) => (v === null || v === undefined ? "" : String(v)))],
    },
  });
}

async function updateRow(
  sheet: string,
  rowNum: number,
  values: (string | number | null | undefined)[]
): Promise<void> {
  const client = getClient();
  const endCol = String.fromCharCode(64 + values.length);
  await client.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A${rowNum}:${endCol}${rowNum}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [values.map((v) => (v === null || v === undefined ? "" : String(v)))],
    },
  });
}

async function deleteRow(sheet: string, rowNum: number): Promise<void> {
  const client = getClient();
  const spreadsheet = await client.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheetObj = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === sheet
  );
  const sheetId = sheetObj?.properties?.sheetId ?? 0;

  await client.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNum - 1, // 0-based
              endIndex: rowNum,
            },
          },
        },
      ],
    },
  });
}

// returns 1-based row number (including header), or -1
async function findRowById(sheet: string, id: string): Promise<number> {
  const rows = await getRows(sheet);
  const idx = rows.findIndex((r) => r[0] === id);
  return idx === -1 ? -1 : idx + 2;
}

// ── Row → Type parsers ────────────────────────────────────────────────────────

function toPlayer(r: string[]): Player {
  return { id: r[0], name: r[1], created_at: r[2] ?? "" };
}

function toSession(r: string[]): Session {
  return {
    id: r[0],
    date: r[1],
    location: r[2] ?? "",
    notes: r[3] ?? "",
    status: (r[4] ?? "active") as "active" | "completed",
    created_at: r[5] ?? "",
  };
}

function toMatch(r: string[]): Match {
  const num = (i: number) =>
    r[i] !== "" && r[i] !== undefined ? parseInt(r[i]) : null;
  return {
    id: r[0],
    session_id: r[1],
    match_number: parseInt(r[2]) || 0,
    court: r[3] ?? "",
    status: (r[4] ?? "pending") as Match["status"],
    team1_player1_id: r[5] || null,
    team1_player2_id: r[6] || null,
    team2_player1_id: r[7] || null,
    team2_player2_id: r[8] || null,
    team1_score: num(9),
    team2_score: num(10),
    winner_team: num(11) as 1 | 2 | null,
    created_at: r[12] ?? "",
  };
}

// ── Public database object ────────────────────────────────────────────────────

export const db = {
  // ── Players ────────────────────────────────────────────────────────────────
  players: {
    async list(): Promise<Player[]> {
      const rows = await getRows("players");
      return rows.filter((r) => r[0]).map(toPlayer);
    },

    async create(name: string): Promise<Player> {
      const p: Player = {
        id: randomUUID(),
        name,
        created_at: new Date().toISOString(),
      };
      await appendRow("players", [p.id, p.name, p.created_at]);
      return p;
    },

    async findByName(name: string): Promise<Player | null> {
      const rows = await getRows("players");
      const row = rows.find(
        (r) => r[1]?.toLowerCase() === name.toLowerCase()
      );
      return row ? toPlayer(row) : null;
    },
  },

  // ── Sessions ───────────────────────────────────────────────────────────────
  sessions: {
    async list(): Promise<Session[]> {
      const rows = await getRows("sessions");
      return rows
        .filter((r) => r[0])
        .map(toSession)
        .sort((a, b) => b.date.localeCompare(a.date));
    },

    async get(id: string): Promise<Session | null> {
      const rows = await getRows("sessions");
      const row = rows.find((r) => r[0] === id);
      return row ? toSession(row) : null;
    },

    async create(data: {
      date: string;
      location: string;
      notes: string;
    }): Promise<Session> {
      const s: Session = {
        id: randomUUID(),
        date: data.date,
        location: data.location ?? "",
        notes: data.notes ?? "",
        status: "active",
        created_at: new Date().toISOString(),
      };
      await appendRow("sessions", [
        s.id, s.date, s.location, s.notes, s.status, s.created_at,
      ]);
      return s;
    },

    async update(id: string, data: { status?: string }): Promise<void> {
      const rows = await getRows("sessions");
      const idx = rows.findIndex((r) => r[0] === id);
      if (idx === -1) return;
      const row = [...rows[idx]];
      if (data.status) row[4] = data.status;
      await updateRow("sessions", idx + 2, row);
    },

    async delete(id: string): Promise<void> {
      // delete matches first (bottom-to-top so row numbers stay valid)
      const mRows = await getRows("matches");
      const mToDelete = mRows
        .map((r, i) => ({ r, num: i + 2 }))
        .filter(({ r }) => r[1] === id)
        .map(({ num }) => num)
        .sort((a, b) => b - a);
      for (const num of mToDelete) await deleteRow("matches", num);

      // delete session_players
      const spRows = await getRows("session_players");
      const spToDelete = spRows
        .map((r, i) => ({ r, num: i + 2 }))
        .filter(({ r }) => r[1] === id)
        .map(({ num }) => num)
        .sort((a, b) => b - a);
      for (const num of spToDelete) await deleteRow("session_players", num);

      // delete session row
      const rowNum = await findRowById("sessions", id);
      if (rowNum !== -1) await deleteRow("sessions", rowNum);
    },
  },

  // ── Session Players ────────────────────────────────────────────────────────
  sessionPlayers: {
    async getPlayerIds(sessionId: string): Promise<string[]> {
      const rows = await getRows("session_players");
      return rows.filter((r) => r[1] === sessionId).map((r) => r[2]);
    },

    async add(sessionId: string, playerId: string): Promise<void> {
      const rows = await getRows("session_players");
      const exists = rows.some(
        (r) => r[1] === sessionId && r[2] === playerId
      );
      if (exists) return;
      await appendRow("session_players", [
        randomUUID(),
        sessionId,
        playerId,
        new Date().toISOString(),
      ]);
    },

    async remove(sessionId: string, playerId: string): Promise<void> {
      const rows = await getRows("session_players");
      const idx = rows.findIndex(
        (r) => r[1] === sessionId && r[2] === playerId
      );
      if (idx === -1) return;
      await deleteRow("session_players", idx + 2);
    },
  },

  // ── Matches ────────────────────────────────────────────────────────────────
  matches: {
    async getForSession(sessionId: string): Promise<Match[]> {
      const rows = await getRows("matches");
      return rows
        .filter((r) => r[1] === sessionId)
        .map(toMatch)
        .sort((a, b) => a.match_number - b.match_number);
    },

    async create(
      data: Omit<Match, "id" | "created_at">
    ): Promise<Match> {
      const m: Match = {
        ...data,
        id: randomUUID(),
        created_at: new Date().toISOString(),
      };
      await appendRow("matches", [
        m.id, m.session_id, m.match_number, m.court, m.status,
        m.team1_player1_id, m.team1_player2_id,
        m.team2_player1_id, m.team2_player2_id,
        m.team1_score, m.team2_score, m.winner_team,
        m.created_at,
      ]);
      return m;
    },

    async update(
      id: string,
      data: {
        team1_score?: number | null;
        team2_score?: number | null;
        winner_team?: number | null;
        status?: string;
      }
    ): Promise<void> {
      const rows = await getRows("matches");
      const idx = rows.findIndex((r) => r[0] === id);
      if (idx === -1) return;
      const row = [...rows[idx]];
      if ("team1_score" in data)
        row[9] = data.team1_score != null ? String(data.team1_score) : "";
      if ("team2_score" in data)
        row[10] = data.team2_score != null ? String(data.team2_score) : "";
      if ("winner_team" in data)
        row[11] = data.winner_team != null ? String(data.winner_team) : "";
      if (data.status) row[4] = data.status;
      await updateRow("matches", idx + 2, row);
    },

    async delete(id: string): Promise<void> {
      const rowNum = await findRowById("matches", id);
      if (rowNum !== -1) await deleteRow("matches", rowNum);
    },
  },

  // ── Setup: initialise header rows ─────────────────────────────────────────
  async setup(): Promise<void> {
    const client = getClient();

    // Get existing sheets
    const spreadsheet = await client.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const existingSheets = new Set(
      spreadsheet.data.sheets?.map((s) => s.properties?.title) ?? []
    );

    const sheets = [
      { name: "players",        headers: ["id", "name", "created_at"] },
      { name: "sessions",       headers: ["id", "date", "location", "notes", "status", "created_at"] },
      { name: "session_players", headers: ["id", "session_id", "player_id", "created_at"] },
      { name: "matches",        headers: ["id", "session_id", "match_number", "court", "status", "team1_player1_id", "team1_player2_id", "team2_player1_id", "team2_player2_id", "team1_score", "team2_score", "winner_team", "created_at"] },
    ];

    // Create missing sheets
    const toCreate = sheets.filter((s) => !existingSheets.has(s.name));
    if (toCreate.length > 0) {
      await client.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: toCreate.map((s) => ({
            addSheet: { properties: { title: s.name } },
          })),
        },
      });
    }

    // Write header rows
    for (const s of sheets) {
      const existing = await client.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${s.name}!A1:Z1`,
      });
      const firstRow = existing.data.values?.[0];
      if (!firstRow || firstRow[0] !== "id") {
        await client.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${s.name}!A1`,
          valueInputOption: "RAW",
          requestBody: { values: [s.headers] },
        });
      }
    }
  },
};
