import { google } from "googleapis";

const SHEET_ID = "1MbHCyopMOW9r3FCClU3ZKcAXlUCfUSgZgmqFbDr8p6c";

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: process.env.GOOGLE_TYPE,
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const [thongTin, bangCong, roomLogs] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "ThongTin!A1:H",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "BangCong!A1:H",
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "RoomLogs!A1:F",
      }),
    ]);

    return Response.json({
      thongTin: thongTin.data.values || [],
      bangCong: bangCong.data.values || [],
      roomLogs: roomLogs.data.values || [],
    });
  } catch (error: any) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
