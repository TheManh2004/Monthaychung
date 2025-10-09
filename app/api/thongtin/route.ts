import { google } from "googleapis";
import path from "path";
import fs from "fs";

const SHEET_ID = "1MbHCyopMOW9r3FCCIU3ZKcAXIUCfUSgZgmqFbDr8p6c";

export async function GET() {
  try {
    const credentials = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "arduino-160cd0286643.json"), "utf8")
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "ThongTin!A1:G",
    });

    return Response.json({ data: res.data.values });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
