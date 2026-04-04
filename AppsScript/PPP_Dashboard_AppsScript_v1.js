function doGet(e) {
  const SHEET_ID = '1dEBSAcmkT5tQmzaQDQEieex3WMCyPBi1JjQdOpVH8Nc';
  const GID = 660147076;

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheets().find(s => s.getSheetId() === GID);
    const data = sheet.getDataRange().getValues();

    const headers = data[0].map(h => String(h).trim());
    const rows = data.slice(1)
      .filter(r => String(r[0]).trim().startsWith('PPP'))
      .map(r => {
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = (r[i] !== undefined && r[i] !== null) ? String(r[i]) : '';
        });
        return obj;
      });

    return ContentService
      .createTextOutput(JSON.stringify({
        data: rows,
        count: rows.length,
        updated: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
