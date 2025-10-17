import { google } from "googleapis";

const SHEET_ID = "1MbHCyopMOW9r3FCClU3ZKcAXlUCfUSgZgmqFbDr8p6c";

// Lấy auth chung
async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: process.env.GOOGLE_TYPE,
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// 🧾 GET: Lấy danh sách nhân viên
export async function GET() {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "ThongTin!A2:H",
  });
  return Response.json(res.data.values || []);
}



// ➕ POST: Thêm nhân viên
export async function POST(req: Request) {
  const body = await req.json();
  const { maThe, ten, sdt, ngaySinh, phongBan, vaiTro } = body;
  const sheets = await getSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "ThongTin!A2:H",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[, maThe, ten, sdt, ngaySinh, phongBan, vaiTro]] },
  });

  return Response.json({ success: true });
}

// 🔹 PUT: Sửa theo mã thẻ
export async function PUT(req: Request) {
    const sheets = await getSheets();
    const body = await req.json();
  
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "ThongTin!A1:H",
    });
    const rows = res.data.values || [];
  
    const idx = rows.findIndex((r: any) => r[1] === body.maThe);
    if (idx === -1) return Response.json({ error: "Không tìm thấy" }, { status: 404 });
  
    rows[idx] = [
      rows[idx][0],
      body.maThe,
      body.ten,
      body.sdt,
      body.ngaySinh,
      body.phongBan,
      body.vaiTro,
      rows[idx][7] || "",
    ];
  
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `ThongTin!A${idx + 1}:H${idx + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [rows[idx]] },
    });
  
    return await GET();
  }

// 🗑 DELETE: Xóa nhân viên theo mã thẻ
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const maThe = searchParams.get("maThe");
  if (!maThe) return Response.json({ error: "Thiếu mã thẻ" }, { status: 400 });

  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "ThongTin!A2:H",
  });

  const rows = res.data.values || [];
  const index = rows.findIndex((r) => r[1] === maThe);
  if (index === -1) return Response.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });

  const startRow = index + 2;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{ deleteDimension: { range: { sheetId: 0, dimension: "ROWS", startIndex: startRow - 1, endIndex: startRow } } }],
    },
  });

  return Response.json({ success: true });
}
