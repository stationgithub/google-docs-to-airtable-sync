/**
 * Doc → Airtable Sync (Generic)
 * - Manual sync (with UI alerts)
 * - Silent sync (for triggers)
 * - Exact field names (Doc table key must match Airtable field)
 * - Token block for LatestUpdates with duplicate-token guard
 *
 * Script Properties required:
 *  AIRTABLE_API_KEY
 *  AIRTABLE_BASE_ID
 *  AIRTABLE_TABLE_NAME
 *
 * Also recommended:
 *  DOC_TOKEN_LATEST_UPDATE = LatestUpdates
 *  AIRTABLE_UPDATES_FIELD = LatestUpdates
 */

const DocAirtableSync = (() => {
  const AIRTABLE_API_URL = "https://api.airtable.com/v0";

  const PROP = {
    API_KEY: "AIRTABLE_API_KEY",
    BASE_ID: "AIRTABLE_BASE_ID",
    TABLE_NAME: "AIRTABLE_TABLE_NAME",

    DOCID_FIELD: "AIRTABLE_DOCID_FIELD",
    DOCURL_FIELD: "AIRTABLE_DOCURL_FIELD",
    LASTSYNCED_FIELD: "AIRTABLE_LASTSYNCED_FIELD",
    UPDATES_FIELD: "AIRTABLE_UPDATES_FIELD",

    TOKEN_LATEST: "DOC_TOKEN_LATEST_UPDATE"
  };

  const DEFAULTS = {
    docIdField: "DocId",
    docUrlField: "DocUrl",
    lastSyncedField: "LastSyncedAt",
    updatesField: "LatestUpdates",
    latestToken: "LatestUpdates"
  };

  // ---------- Public API ----------

  function createMenu() {
    DocumentApp.getUi()
      .createMenu("Doc Sync")
      .addItem("Sync to Airtable", "handleManualSync")
      .addSeparator()
      .addItem("Stop Auto-Sync", "handleStopSync")
      .addToUi();
  }

  function ensureTriggerExists(handlerFunctionName, minutes) {
    const triggers = ScriptApp.getProjectTriggers();
    const exists = triggers.some(t => t.getHandlerFunction() === handlerFunctionName);
    if (exists) return;

    ScriptApp.newTrigger(handlerFunctionName)
      .timeBased()
      .everyMinutes(minutes || 10)
      .create();
  }

  function removeTrigger(handlerFunctionName) {
    const triggers = ScriptApp.getProjectTriggers();
    let removed = false;

    triggers.forEach(t => {
      if (t.getHandlerFunction() === handlerFunctionName) {
        ScriptApp.deleteTrigger(t);
        removed = true;
      }
    });

    DocumentApp.getUi().alert(removed ? "Auto-sync stopped." : "Auto-sync was not running.");
  }

  function syncManual() {
    const ui = DocumentApp.getUi();
    try {
      const cfg = getConfig_();
      assertConfig_(cfg);

      const pack = buildFields_(cfg);
      const docId = pack.fields[cfg.docIdField];

      const found = findByDocId_(cfg, docId);
      if (!found || !found.id) {
        throw new Error("Record not found in Airtable. Create the record first, then sync again.");
      }

      updateRecord_(cfg, found.id, omitFields_(pack.fields, [cfg.docIdField, cfg.docUrlField]));

      if (pack.warnings.length) {
        ui.alert(`Sync complete.\n\nWarnings:\n- ${pack.warnings.join("\n- ")}`);
      } else {
        ui.alert("Sync complete.");
      }
    } catch (err) {
      ui.alert("Sync failed", String(err), ui.ButtonSet.OK);
    }
  }

  function syncSilent() {
    try {
      const cfg = getConfig_();
      if (!cfg.apiKey || !cfg.baseId || !cfg.tableName) return;

      const pack = buildFields_(cfg);
      const docId = pack.fields[cfg.docIdField];

      const found = findByDocId_(cfg, docId);
      if (!found || !found.id) return;

      updateRecord_(cfg, found.id, omitFields_(pack.fields, [cfg.docIdField, cfg.docUrlField]));
    } catch (err) {
      console.error("Silent sync failed: " + err);
    }
  }

  // ---------- Internal ----------

  function getConfig_() {
    const props = PropertiesService.getScriptProperties();

    return {
      apiKey: props.getProperty(PROP.API_KEY),
      baseId: props.getProperty(PROP.BASE_ID),
      tableName: props.getProperty(PROP.TABLE_NAME),

      docIdField: props.getProperty(PROP.DOCID_FIELD) || DEFAULTS.docIdField,
      docUrlField: props.getProperty(PROP.DOCURL_FIELD) || DEFAULTS.docUrlField,
      lastSyncedField: props.getProperty(PROP.LASTSYNCED_FIELD) || DEFAULTS.lastSyncedField,
      updatesField: props.getProperty(PROP.UPDATES_FIELD) || DEFAULTS.updatesField,

      latestToken: props.getProperty(PROP.TOKEN_LATEST) || DEFAULTS.latestToken
    };
  }

  function assertConfig_(cfg) {
    if (!cfg.apiKey) throw new Error("Missing AIRTABLE_API_KEY in Script Properties.");
    if (!cfg.baseId) throw new Error("Missing AIRTABLE_BASE_ID in Script Properties.");
    if (!cfg.tableName) throw new Error("Missing AIRTABLE_TABLE_NAME in Script Properties.");
  }

  function buildFields_(cfg) {
    const doc = DocumentApp.getActiveDocument();
    const fields = {};
    const warnings = [];

    fields[cfg.docIdField] = doc.getId();
    fields[cfg.docUrlField] = doc.getUrl();
    fields[cfg.lastSyncedField] = new Date().toISOString();

    const kv = parseKVFromTablesExactFieldNames_();
    Object.assign(fields, kv);

    if (!Object.keys(kv).length) warnings.push("No key/value table fields found.");

    const latestRes = parseLatestUpdate_(cfg.latestToken);
    if (latestRes.text) fields[cfg.updatesField] = latestRes.text;
    if (latestRes.warning) warnings.push(latestRes.warning);

    return { fields, warnings };
  }

  function canon_(s) {
    return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function parseLatestUpdate_(token) {
    const body = DocumentApp.getActiveDocument().getBody();
    const paras = body.getParagraphs();

    const target = canon_(token);
    const tokenIdxs = [];

    for (let i = 0; i < paras.length; i++) {
      if (canon_(paras[i].getText()) === target) tokenIdxs.push(i);
    }

    if (!tokenIdxs.length) return { text: "", warning: `Token "${token}" not found.` };
    if (tokenIdxs.length > 1) return { text: "", warning: `Token "${token}" appears more than once.` };

    const startIdx = tokenIdxs[0];
    for (let i = startIdx + 1; i < paras.length; i++) {
      const t = paras[i].getText().trim();
      if (t) return { text: t, warning: "" };
    }

    return { text: "", warning: `Token "${token}" found but no value below it.` };
  }

  function parseKVFromTablesExactFieldNames_() {
    const body = DocumentApp.getActiveDocument().getBody();
    const tables = body.getTables();
    if (!tables || !tables.length) return {};

    const out = {};
    for (const table of tables) {
      const rows = table.getNumRows();
      for (let r = 0; r < rows; r++) {
        const row = table.getRow(r);
        if (row.getNumCells() < 2) continue;

        const fieldName = row.getCell(0).getText().trim();
        const value = row.getCell(1).getText().trim();
        if (!fieldName || !value) continue;

        // Prevent accidental overwrites if someone adds these to the table
        if (fieldName === "DocId" || fieldName === "DocUrl") continue;

        out[fieldName] = value;
      }
    }
    return out;
  }

  function omitFields_(fields, omitList) {
    const copy = Object.assign({}, fields);
    (omitList || []).forEach(k => delete copy[k]);
    return copy;
  }

  function escapeFormulaString_(s) {
    return String(s || "").replace(/'/g, "\\'");
  }

  function findByDocId_(cfg, docId) {
    const fieldName = cfg.docIdField;
    const safeDocId = escapeFormulaString_(docId);
    const formula = `{${fieldName}}='${safeDocId}'`;

    const url =
      `${AIRTABLE_API_URL}/${encodeURIComponent(cfg.baseId)}/${encodeURIComponent(cfg.tableName)}?` +
      `filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;

    const res = airtableFetch_(cfg, url, { method: "get" });
    return (res && res.records && res.records.length) ? res.records[0] : null;
  }

  function updateRecord_(cfg, recordId, fields) {
    const url = `${AIRTABLE_API_URL}/${encodeURIComponent(cfg.baseId)}/${encodeURIComponent(cfg.tableName)}`;
    const payload = { records: [{ id: recordId, fields }], typecast: true };
    return airtableFetch_(cfg, url, { method: "patch", payload });
  }

  function airtableFetch_(cfg, url, opts) {
    const headers = {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json"
    };

    const params = {
      method: (opts && opts.method) || "get",
      headers,
      muteHttpExceptions: true
    };

    if (opts && opts.payload) params.payload = JSON.stringify(opts.payload);

    const resp = UrlFetchApp.fetch(url, params);
    const code = resp.getResponseCode();
    const body = resp.getContentText();

    if (code >= 200 && code < 300) return body ? JSON.parse(body) : {};
    throw new Error(`Airtable error ${code}: ${body}`);
  }

  return {
    createMenu,
    ensureTriggerExists,
    removeTrigger,
    syncManual,
    syncSilent
  };
})();
