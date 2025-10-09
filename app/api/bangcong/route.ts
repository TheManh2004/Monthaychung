import { google } from "googleapis";
import path from "path";

const SHEET_ID = "1MbHCyopMOW9r3FCClU3ZKcAXlUCfUSgZgmqFbDr8p6c"; 

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
        keyFile: path.join(process.cwd(), "aruduno-b93e048326ae.json"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "BangCong!A1:H",
    });

    return Response.json({ data: res.data.values });
  } catch (error: any) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
