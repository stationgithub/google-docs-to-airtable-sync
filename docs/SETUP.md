
On the next non-empty line, write the update text you want synced to Airtable.

#### Rules for `LatestUpdates`

- It must appear **once and only once**
- It must be in the same document being synced
- Do not place it in:
  - a separate Google Doc
  - comments or suggestions
  - repeated headers or section labels

If the token appears more than once, the sync will warn and skip this field.

---

### Key–value table

Add a 2-column table anywhere in the document:

| Field | Value |
|---|---|
| TeamRoles | Editor, PM |
| NewsroomPartners | Standards, Legal |
| NDSManager | Name |

Rules:
- The left column must match Airtable field names **exactly**
- You may have multiple tables; all rows are merged
- Empty rows are ignored

---

## Step 6: First Sync and Authorization (One-Time)

1. In the Google Doc menu bar, select:  
   **NDS AirBase → Sync Updates to Airtable**
2. Follow the authorization prompts.
3. When prompted, choose **“Select all”** permissions.

This first run:
- Authorizes the script
- Writes the initial data to Airtable
- Enables automatic background syncs

---

## Common Initial Error (Expected Behavior)

During initial setup, **recently created or moved documents may take a few minutes to be recognized by Airtable**.

If an error appears on the first sync:
1. Wait 1–2 minutes
2. Run **NDS AirBase → Sync Updates to Airtable** again

This is normal and usually resolves on the second attempt.

After setup, the sync runs automatically several times per day.

You can always force an immediate update using:
**NDS AirBase → Sync Updates to Airtable**

---

## Ongoing Use

- Manual sync runs immediately and shows alerts
- Auto-sync runs silently in the background
- Stopping auto-sync archives the document safely

For questions or issues, contact the template maintainer.

---

## Guardrails and Behavior

- `LatestUpdates` appearing more than once is treated as an error
- `DocId` and `DocUrl` cannot be overwritten from tables
- Missing Airtable records cause the sync to fail safely
- Table fields not present in Airtable are ignored by Airtable

---

## Security Notes

- Never commit Airtable tokens to GitHub
- Rotate tokens immediately if exposed
- Use least-privilege Airtable access whenever possible
