
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const GAME_DURATION = 30 * 60 * 1000;
const SAVE_FILE = path.join(__dirname, "rooms.json");

const rooms = new Map();
const clients = new Map();

const makeId = () => crypto.randomBytes(16).toString("hex");
const makeCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();
const clean = (v, max = 200) => String(v ?? "").trim().slice(0, max);

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

async function body(req) {
  return new Promise(resolve => {
    let raw = "";
    req.on("data", chunk => raw += chunk);
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); }
      catch { resolve({}); }
    });
  });
}

function saveRooms() {
  const data = [...rooms.values()].map(room => ({
    ...room,
    clients: undefined
  }));

  try {
    fs.writeFileSync(SAVE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Save error:", err);
  }
}

function loadRooms() {
  if (!fs.existsSync(SAVE_FILE)) return;

  try {
    const data = JSON.parse(fs.readFileSync(SAVE_FILE, "utf8"));
    for (const room of data) {
      room.clients = new Map();
      rooms.set(room.code, room);
    }
  } catch (err) {
    console.error("Could not load saved rooms:", err);
  }
}

function getRoom(data) {
  return rooms.get(clean(data.code, 8).toUpperCase());
}

function getPlayer(room, pid) {
  return room?.players.find(p => p.id === pid);
}

function blocked(room, fromId, targetId) {
  const solved = room.solved.some(
    x => x.fromId === fromId && x.targetId === targetId
  );

  const attempts = room.guesses.filter(
    x => x.fromId === fromId && x.targetId === targetId
  ).length;

  return solved || attempts >= 2;
}

function remaining(room) {
  if (!room.startedAt) return GAME_DURATION;
  return Math.max(0, GAME_DURATION - (Date.now() - room.startedAt));
}

function finish(room) {
  if (room.status !== "playing") return;
  room.status = "finished";
  room.pendingQuestion = null;
  saveRooms();
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[״”“"'׳‘’.,!?():;\-_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function oneLetterApart(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;

  let i = 0;
  let j = 0;
  let errors = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }

    errors++;
    if (errors > 1) return false;

    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }

  if (i < a.length || j < b.length) errors++;
  return errors <= 1;
}

function isCorrect(guess, answer) {
  const guessWords = normalize(guess).split(" ").filter(Boolean);
  const answerWords = normalize(answer).split(" ").filter(Boolean);

  if (!guessWords.length || !answerWords.length) return false;

  // מילה אחת מתוך שם האישיות יכולה להספיק.
  for (const word of guessWords) {
    for (const answerWord of answerWords) {
      if (oneLetterApart(word, answerWord)) return true;
    }
  }

  return oneLetterApart(
    guessWords.join(" "),
    answerWords.join(" ")
  );
}

function publicRoom(room, pid) {
  const player = getPlayer(room, pid);
  if (!player) return null;

  const left = remaining(room);
  const myQuestions = room.questions
    .filter(q => q.targetId === pid)
    .map(q => ({
      id: q.id,
      fromId: q.fromId,
      text: q.text,
      answer: q.answer,
      answered: q.answered
    }));

  const known = {};
  for (const p of room.players) {
    known[p.id] = room.questions
      .filter(q => q.targetId === p.id && q.answer === true)
      .map(q => q.text);
  }

  const targets = room.players
    .filter(p => p.id !== pid)
    .map(p => ({
      id: p.id,
      name: p.name,
      blocked: blocked(room, pid, p.id),
      guessesLeft: Math.max(
        0,
        2 - room.guesses.filter(
          g => g.fromId === pid && g.targetId === p.id
        ).length
      )
    }));

  const turnPlayer = room.turnOrder.length
    ? room.turnOrder[room.turnIndex]
    : null;

  const pendingQuestion =
    room.pendingQuestion?.targetId === pid
      ? {
          id: room.pendingQuestion.id,
          text: room.pendingQuestion.text,
          fromName: getPlayer(room, room.pendingQuestion.fromId)?.name || ""
        }
      : null;

  const results = room.status === "finished"
    ? room.players.map(p => ({
        id: p.id,
        name: p.name,
        personality: p.personality,
        points: room.scores[p.id] || 0,
        guesses: room.guesses
          .filter(g => g.fromId === p.id)
          .map(g => ({
            targetName: getPlayer(room, g.targetId)?.name || "",
            text: g.text,
            correct: g.correct,
            points: g.points,
            seconds: g.seconds
          }))
      })).sort((a, b) => b.points - a.points)
    : null;

  return {
    code: room.code,
    status: room.status,
    hostId: room.hostId,
    myId: pid,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      ready: Boolean(p.personality)
    })),
    remaining: left,
    round: room.round,
    turnPlayer,
    myTurn:
      room.status === "playing" &&
      turnPlayer === pid &&
      !room.pendingQuestion,
    questions: myQuestions,
    known,
    targets,
    chat: room.chat.slice(-200),
    pendingQuestion,
    myGuesses: room.guesses.filter(g => g.fromId === pid),
    results
  };
}

function broadcast(room) {
  for (const [pid, connections] of room.clients.entries()) {
    const data = publicRoom(room, pid);
    if (!data) continue;

    const message = `data: ${JSON.stringify(data)}\n\n`;

    for (const res of [...connections]) {
      try {
        res.write(message);
      } catch {
        connections.delete(res);
      }
    }
  }
}

function nextTurn(room) {
  if (room.status !== "playing") return;

  room.turnIndex++;

  if (room.turnIndex >= room.turnOrder.length) {
    room.turnIndex = 0;
    room.round++;
    room.turnOrder = room.players
      .map(p => p.id)
      .sort(() => Math.random() - 0.5);
  }
}

function addChat(room, from, text, type = "message") {
  room.chat.push({
    id: makeId(),
    from,
    text,
    type,
    at: Date.now()
  });

  if (room.chat.length > 500) {
    room.chat = room.chat.slice(-500);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/") {
    const file = path.join(__dirname, "index.html");
    if (!fs.existsSync(file)) {
      res.writeHead(404);
      return res.end("index.html not found");
    }

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8"
    });
    return res.end(fs.readFileSync(file));
  }

  if (req.method === "GET" && url.pathname === "/events") {
    const code = clean(url.searchParams.get("code"), 8).toUpperCase();
    const pid = clean(url.searchParams.get("pid"), 100);
    const room = rooms.get(code);

    if (!room || !getPlayer(room, pid)) {
      return send(res, 404, { error: "המשחק או השחקן לא נמצאו" });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    res.write("retry: 2000\n\n");

    if (!room.clients.has(pid)) {
      room.clients.set(pid, new Set());
    }

    room.clients.get(pid).add(res);

    res.write(`data: ${JSON.stringify(publicRoom(room, pid))}\n\n`);

    req.on("close", () => {
      room.clients.get(pid)?.delete(res);
    });

    return;
  }

  if (req.method !== "POST") {
    return send(res, 404, { error: "Not found" });
  }

  const data = await body(req);

  try {
    if (url.pathname === "/api/create") {
      const name = clean(data.name, 24);
      if (!name) return send(res, 400, { error: "צריך להזין שם" });

      let code;
      do { code = makeCode(); } while (rooms.has(code));

      const pid = makeId();

      const room = {
        code,
        hostId: pid,
        status: "lobby",
        players: [{ id: pid, name, personality: "" }],
        startedAt: null,
        turnOrder: [],
        turnIndex: 0,
        round: 1,
        questions: [],
        pendingQuestion: null,
        chat: [],
        guesses: [],
        solved: [],
        scores: {},
        clients: new Map()
      };

      rooms.set(code, room);
      saveRooms();

      return send(res, 200, { code, pid });
    }

    if (url.pathname === "/api/join") {
      const code = clean(data.code, 8).toUpperCase();
      const name = clean(data.name, 24);
      const room = rooms.get(code);

      if (!room) return send(res, 404, { error: "קוד המשחק לא נמצא" });
      if (room.status !== "lobby") {
        return send(res, 400, { error: "המשחק כבר התחיל" });
      }
      if (!name) return send(res, 400, { error: "צריך להזין שם" });
      if (room.players.length >= 12) {
        return send(res, 400, { error: "החדר מלא" });
      }
      if (room.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        return send(res, 400, { error: "השם הזה כבר תפוס" });
      }

      const pid = makeId();
      room.players.push({ id: pid, name, personality: "" });

      saveRooms();
      broadcast(room);
      return send(res, 200, { code, pid });
    }

    const room = getRoom(data);
    const player = getPlayer(room, data.pid);

    if (!room || !player) {
      return send(res, 404, { error: "לא הצלחנו לזהות אותך בחדר" });
    }

    if (url.pathname === "/api/reconnect") {
      return send(res, 200, { ok: true });
    }

    if (url.pathname === "/api/personality") {
      if (room.status !== "lobby") {
        return send(res, 400, { error: "המשחק כבר התחיל" });
      }

      const personality = clean(data.personality, 100);
      if (!personality) {
        return send(res, 400, { error: "צריך לבחור אישיות" });
      }

      player.personality = personality;
      saveRooms();
      broadcast(room);
      return send(res, 200, { ok: true });
    }

    if (url.pathname === "/api/start") {
      if (player.id !== room.hostId) {
        return send(res, 403, { error: "רק המארח יכול להתחיל" });
      }
      if (room.players.length < 2) {
        return send(res, 400, { error: "צריך לפחות שני שחקנים" });
      }
      if (room.players.some(p => !p.personality)) {
        return send(res, 400, { error: "כולם צריכים לבחור אישיות" });
      }

      room.status = "playing";
      room.startedAt = Date.now();
      room.turnOrder = room.players
        .map(p => p.id)
        .sort(() => Math.random() - 0.5);
      room.turnIndex = 0;
      room.round = 1;

      addChat(room, "המערכת", "המשחק התחיל! בהצלחה לכולם.", "system");
      saveRooms();
      broadcast(room);
      return send(res, 200, { ok: true });
    }

    if (room.status === "playing" && remaining(room) <= 0) {
      finish(room);
      broadcast(room);
      return send(res, 200, { ok: true });
    }

    if (room.status !== "playing") {
      return send(res, 400, { error: "המשחק אינו פעיל" });
    }

    if (url.pathname === "/api/ask") {
      if (room.turnOrder[room.turnIndex] !== player.id) {
        return send(res, 403, { error: "זה לא התור שלך" });
      }
      if (room.pendingQuestion) {
        return send(res, 400, { error: "ממתינים לתשובה לשאלה" });
      }

      const target = getPlayer(room, data.targetId);
      const text = clean(data.text, 240);

      if (!target || target.id === player.id || !text) {
        return send(res, 400, { error: "צריך לבחור שחקן ולכתוב שאלה" });
      }
      if (blocked(room, player.id, target.id)) {
        return send(res, 400, {
          error: "כבר גילית אותו או שנגמרו לך הניחושים עליו"
        });
      }

      const question = {
        id: makeId(),
        fromId: player.id,
        targetId: target.id,
        text,
        answer: null,
        answered: false,
        at: Date.now()
      };

      room.questions.push(question);
      room.pendingQuestion = question;

      saveRooms();
      broadcast(room);
      return send(res, 200, { ok: true });
    }

    if (url.pathname === "/api/answer") {
      const q = room.pendingQuestion;

      if (!q || q.targetId !== player.id) {
        return send(res, 403, { error: "אין שאלה שממתינה לך" });
      }

      q.answer = data.answer === true;
      q.answered = true;
      q.answeredAt = Date.now();
      room.pendingQuestion = null;

      const answerText = q.answer ? "✓ כן" : "✕ לא";
      addChat(
        room,
        player.name,
        `ענה לשאלה: ${q.text} — ${answerText}`,
        "answer"
      );

      nextTurn(room);
      saveRooms();
      broadcast(room);
      return send(res, 200, { ok: true });
    }

    if (url.pathname === "/api/chat") {
      const text = clean(data.text, 500);
      if (!text) return send(res, 400, { error: "הודעה ריקה" });

      addChat(room, player.name, text);
      saveRooms();
      broadcast(room);
      return send(res, 200, { ok: true });
    }

    if (url.pathname === "/api/guess") {
      const target = getPlayer(room, data.targetId);
      const text = clean(data.text, 100);

      if (!target || target.id === player.id || !text) {
        return send(res, 400, { error: "צריך לבחור שחקן ולכתוב ניחוש" });
      }

      if (blocked(room, player.id, target.id)) {
        return send(res, 400, {
          error: "כבר גילית אותו או שנגמרו לך הניחושים"
        });
      }

      const correct = isCorrect(text, target.personality);
      const elapsed = Date.now() - room.startedAt;
      const secondsLeft = Math.max(
        0,
        Math.floor((GAME_DURATION - elapsed) / 1000)
      );

      const minutes = Math.floor(secondsLeft / 60);
      const seconds = secondsLeft % 60;
      const points = correct ? minutes * 100 + seconds : 0;

      const guess = {
        id: makeId(),
        fromId: player.id,
        targetId: target.id,
        text,
        correct,
        points,
        seconds: Math.floor(elapsed / 1000),
        at: Date.now()
      };

      room.guesses.push(guess);

      if (correct) {
        room.scores[player.id] =
          (room.scores[player.id] || 0) + points;

        room.solved.push({
          fromId: player.id,
          targetId: target.id,
          at: Date.now()
        });

        addChat(
          room,
          "המערכת",
          `${player.name} גילה את האישיות של ${target.name}!`,
          "system"
        );
      }

      saveRooms();
      broadcast(room);

      return send(res, 200, {
        correct,
        points,
        guessesLeft: Math.max(
          0,
          2 - room.guesses.filter(
            g => g.fromId === player.id && g.targetId === target.id
          ).length
        )
      });
    }

    return send(res, 404, { error: "פעולה לא מוכרת" });

  } catch (err) {
    console.error(err);
    return send(res, 500, { error: "שגיאת שרת" });
  }
});

loadRooms();

setInterval(() => {
  for (const room of rooms.values()) {
    if (room.status === "playing" && remaining(room) <= 0) {
      finish(room);
      broadcast(room);
    }
  }
}, 1000);

server.listen(PORT, () => {
  console.log(`Identity game running on port ${PORT}`);
});
