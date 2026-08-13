// SECTORMAP STATIC SHIM — replaces the FastAPI backend with client-side logic.
// Ports of app/server.py: group_records, build_graph_payload, search scoring.
(function () {
  const ARCHIVE = window.SECTORMAP_ARCHIVE;
  if (!ARCHIVE) return;
  const records = ARCHIVE.records;
  const RELATIONSHIP_MODES = ["type", "tags", "source", "domain", "text_similarity"];
  const SEARCHABLE_FIELDS = {
    all: ["title", "description", "tags", "type", "candidate_types", "source", "url"],
    title: ["title"],
    description: ["description"],
    tags: ["tags"],
    type: ["type"],
    source: ["source"],
    url: ["url"],
  };

  function splitTags(value) {
    return String(value || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  }

  function extractDomain(url) {
    let u = String(url || "");
    if (!/:\/\//.test(u)) u = "https://" + u;
    try {
      return new URL(u).hostname.toLowerCase().replace(/^www\./, "");
    } catch (e) {
      return u.toLowerCase().replace(/^www\./, "");
    }
  }

  function tokenizeText(value) {
    const tokens = [];
    let current = [];
    for (const ch of String(value).toLowerCase()) {
      if (/[a-z0-9]/.test(ch)) current.push(ch);
      else if (current.length) {
        const token = current.join("");
        if (token.length >= 4) tokens.push(token);
        current = [];
      }
    }
    if (current.length) {
      const token = current.join("");
      if (token.length >= 4) tokens.push(token);
    }
    return tokens;
  }

  function deriveTextBuckets(recs) {
    const tokenCounts = {};
    const recordTokens = {};
    for (const record of recs) {
      const tokens = tokenizeText(record.title + " " + (record.description || ""));
      recordTokens[record.id] = tokens;
      for (const token of new Set(tokens)) tokenCounts[token] = (tokenCounts[token] || 0) + 1;
    }
    const topTokens = new Set(
      Object.entries(tokenCounts).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([t]) => t)
    );
    const buckets = {};
    for (const record of recs) {
      for (const token of recordTokens[record.id]) {
        if (topTokens.has(token)) { buckets[record.id] = token; break; }
      }
    }
    return buckets;
  }

  function groupRecords(recs, mode) {
    const groups = {};
    const textBuckets = mode === "text_similarity" ? deriveTextBuckets(recs) : {};
    const tagCounts = {};
    for (const r of recs) for (const t of splitTags(r.tags)) tagCounts[t] = (tagCounts[t] || 0) + 1;
    const topTags = new Set(Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([t]) => t));
    for (const record of recs) {
      let key = "untyped";
      if (mode === "type") key = String(record.type || "").trim().toLowerCase() || "untyped";
      else if (mode === "source") key = String(record.source || "").trim().toLowerCase() || "unknown-source";
      else if (mode === "domain") key = extractDomain(record.url) || "unknown-domain";
      else if (mode === "tags") {
        const tags = splitTags(record.tags).filter((t) => topTags.has(t));
        key = tags[0] || "untagged";
      } else if (mode === "text_similarity") key = textBuckets[record.id] || "misc-similarity";
      (groups[key] = groups[key] || []).push(record);
    }
    return groups;
  }

  function buildGraphPayload(recs, mode, focusKey) {
    const groups = groupRecords(recs, mode);
    const orderedGroups = Object.entries(groups).sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1));
    const visibleGroups = orderedGroups.slice(0, 18);
    const totalVisible = Math.max(1, visibleGroups.length);
    const positioned = [];
    for (let index = 0; index < visibleGroups.length; index++) {
      const [key, members] = visibleGroups[index];
      const count = members.length;
      const bodyKind = count >= 120 ? "sun" : count >= 35 ? "planet" : "moon";
      const angle = (index / totalVisible) * 6.28318;
      const radius = 48 + (index % 6) * 22 + Math.floor(index / 6) * 18;
      const weight = bodyKind === "sun" ? 26 : bodyKind === "planet" ? 18 : 12;
      positioned.push({
        key, count, body_kind: bodyKind,
        x: 50 + radius * Math.cos(angle),
        y: 50 + radius * Math.sin(angle) * 0.74,
        weight,
        sample_records: members.slice(0, 12),
      });
    }
    for (let iter = 0; iter < 18; iter++) {
      let moved = false;
      for (let i = 0; i < positioned.length; i++) {
        for (let j = i + 1; j < positioned.length; j++) {
          const a = positioned[i], b = positioned[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const distance = Math.hypot(dx, dy) || 0.01;
          const minDist = a.weight + b.weight;
          if (distance >= minDist) continue;
          const overlap = (minDist - distance) / 2;
          const pushX = (dx / distance) * overlap, pushY = (dy / distance) * overlap;
          a.x -= pushX; a.y -= pushY; b.x += pushX; b.y += pushY;
          moved = true;
        }
      }
      for (const c of positioned) { c.x = Math.max(-48, Math.min(148, c.x)); c.y = Math.max(-28, Math.min(128, c.y)); }
      if (!moved) break;
    }
    const clusters = positioned.map((c) => ({
      key: c.key,
      label: c.key.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
      count: c.count,
      body_kind: c.body_kind,
      x: Math.round(c.x * 100) / 100,
      y: Math.round(c.y * 100) / 100,
      sample_records: c.sample_records,
    }));
    if (!focusKey && clusters.length) focusKey = clusters[0].key;
    let focus = null;
    if (focusKey && groups[focusKey]) {
      focus = {
        key: focusKey,
        label: focusKey.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
        count: groups[focusKey].length,
        records: groups[focusKey].slice(0, 120),
      };
    }
    return { mode, available_modes: RELATIONSHIP_MODES, clusters, focus };
  }

  function searchRecords(query, field, limit) {
    const columns = SEARCHABLE_FIELDS[field] || SEARCHABLE_FIELDS.all;
    const terms = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return { query, field, results: [] };
    const scored = [];
    for (const record of records) {
      let score = 0;
      let matched = true;
      for (const term of terms) {
        let termMatched = false;
        for (const column of columns) {
          const value = String(record[column] || "").toLowerCase();
          if (value.includes(term)) { score += 1; termMatched = true; }
        }
        if (!termMatched) { matched = false; break; }
      }
      if (matched) scored.push({ record, score });
    }
    scored.sort((a, b) => b.score - a.score || a.record.id - b.record.id);
    return { query, field, results: scored.slice(0, limit || 10).map((s) => ({ ...s.record, score: s.score })) };
  }

  function findFocusKeyForRecord(recs, mode, recordId) {
    const target = recs.find((r) => r.id === recordId);
    if (!target) return null;
    const groups = groupRecords(recs, mode);
    for (const [key, members] of Object.entries(groups)) {
      if (members.some((r) => r.id === recordId)) return key;
    }
    return null;
  }

  // ---- fetch interceptor ----
  const originalFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input && input.url ? input.url : String(input);
    const path = url.split("?")[0];
    const params = new URLSearchParams(url.includes("?") ? url.split("?")[1] : "");

    const json = (data) => Promise.resolve(new Response(JSON.stringify(data), {
      status: 200, headers: { "Content-Type": "application/json" },
    }));

    if (path === "/api/stats") return json(ARCHIVE.stats);
    if (path === "/api/types") return json({ types: ARCHIVE.types });
    if (path === "/api/records") {
      const q = params.get("q") || "";
      const field = params.get("field") || "all";
      const type = params.get("type") || null;
      const source = params.get("source") || null;
      const tag = params.get("tag") || null;
      const limit = parseInt(params.get("limit") || "50", 10);
      const offset = parseInt(params.get("offset") || "0", 10);
      let filtered = records;
      if (q) filtered = searchRecords(q, field, 500).results;
      if (type) filtered = filtered.filter((r) => r.type === type);
      if (source) filtered = filtered.filter((r) => r.source === source);
      if (tag) filtered = filtered.filter((r) => splitTags(r.tags).includes(tag.toLowerCase()));
      const page = filtered.slice(offset, offset + limit);
      return json({ total: filtered.length, limit, offset, records: page });
    }
    if (path === "/api/search") {
      const q = params.get("q") || "";
      const field = params.get("field") || "all";
      const limit = parseInt(params.get("limit") || "10", 10);
      return json(searchRecords(q, field, limit));
    }
    if (path === "/api/graph/focus") {
      const recordId = parseInt(params.get("record_id") || "0", 10);
      const mode = params.get("mode") || "type";
      const focusKey = findFocusKeyForRecord(records, mode, recordId);
      if (!focusKey) return json({ error: "Record not found in graph" }, 404);
      const payload = buildGraphPayload(records, mode, focusKey);
      payload.selected_record_id = recordId;
      return json(payload);
    }
    if (path === "/api/graph") {
      const mode = params.get("mode") || "type";
      const focusKey = params.get("focus_key") || null;
      return json(buildGraphPayload(records, mode, focusKey));
    }
    if (path === "/api/export") {
      return json({ error: "Export is unavailable in the static build" }, 400);
    }
    return originalFetch(input, init);
  };
})();
