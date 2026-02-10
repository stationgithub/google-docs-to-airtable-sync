# google-docs-to-airtable-sync
Google Docs → Airtable Sync (Apps Script)
A small Google Apps Script setup that syncs structured fields from a Google Doc into Airtable.

## What it syncs

- `DocId` (Google Doc ID)
- `DocUrl` (Google Doc URL)
- `LastSyncedAt` (ISO timestamp)
- `LatestUpdates` (a token block in the doc)
- Any additional fields defined in a 2-column table, where the left column is the Airtable field name and the right column is the value

## Doc template contract

### 1) LatestUpdates token block

Add a paragraph containing:

LatestUpdates

On the next non-empty line, write the value you want synced to Airtable field `LatestUpdates`.
I highly recommend creating a two cell collumn for this purpose. If you break the title within the document, it will not recognize the input field. Also it is unlikely to recognize Google's built in people or placeholder chips. These should be noted in instructions, if you're sharing a templatized version of the Google Doc for multiple users.

### 2) Key-value table

Create a 2-column table anywhere:

| Field | Value |
|---|---|
| TeamRoles | Name - Editor, Name - PM |
| NewsroomPartners | Standards, Legal |
| NDSManager | Name |

The left cell must match the Airtable field name exactly.

## Airtable requirements

Your table must include these fields:

- `DocId` (Text)
- `DocUrl` (URL or Text)
- `LastSyncedAt` (Date or Text)
- `LatestUpdates` (Long text)

You must create a record for each document and set `DocId` to that document’s ID. This script updates the existing record.

## Setup

### 1) Create an Apps Script project attached to your Google Doc

In the Doc:
- Extensions → Apps Script

Create two files:
- `Library.gs`
- `Bootstrap.gs`

Copy the contents from this repository’s `src/` folder into those files.

### 2) Set Script Properties (where secrets live)

Apps Script → Project Settings → Script properties:

Required:

- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_NAME`

Also set:

- `DOC_TOKEN_LATEST_UPDATE` = `LatestUpdates`
- `AIRTABLE_UPDATES_FIELD` = `LatestUpdates`

### 3) Authorize

Run `handleManualSync` once from the Apps Script editor. Accept permissions.

### 4) Use

In the Google Doc menu:
- Doc Sync → Sync to Airtable

This will also enable auto-sync every 10 minutes.

Stop auto-sync:
- Doc Sync → Stop Auto-Sync

Use for archival purposes

## Security

Be sure not to commit tokens to code. Store elsewhere.
