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
  const [thongTin, rooms, waiting] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "ThongTin!A2:H",
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Rooms!A2:B",
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Waiting!A2:A",
    }),
  ]);
  
  return Response.json({
    thongTin: thongTin.data.values || [],
    rooms: rooms.data.values || [],
    waiting: waiting.data.values?.flat() || [],
  });
}

function formatDate(d: string) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return d; // nếu không phải dạng date thì giữ nguyên
  return `${date.getDate().toString().padStart(2, "0")}/${
    date.getMonth() + 1
  }/${date.getFullYear()}`;
}



// ➕ POST: Thêm nhân viên
export async function POST(req: Request) {
  const body = await req.json();
  const { maThe, ten, sdt, ngaySinh, phongBan, vaiTro } = body;
  const sheets = await getSheets();

  const formattedNgaySinh = formatDate(ngaySinh);
  const sdtValue = sdt ? `="${sdt}"` : "";

  // 1️⃣ Ghi vào ThongTin
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "ThongTin!A2:H",
    valueInputOption: "USER_ENTERED",
      requestBody: { values: [[, maThe, ten, sdtValue, formattedNgaySinh, phongBan, vaiTro]] },
  });

  // 2️⃣ Xóa mã thẻ vừa dùng khỏi Waiting
  const waitingRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Waiting!A2:A",
  });

  const waitingRows = waitingRes.data.values || [];
  const index = waitingRows.findIndex((r) => r[0] === maThe);

  if (index !== -1) {
    const updated = waitingRows.filter((r) => r[0] !== maThe);
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: "Waiting!A2:A",
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: "Waiting!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: updated },
    });
  }

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
  
    const formattedNgaySinh = formatDate(body.ngaySinh);
    const sdtValue = body.sdt ? `="${body.sdt}"` : "";

    rows[idx] = [
      rows[idx][0],
      body.maThe,
      body.ten,
      sdtValue,
      formattedNgaySinh,
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

  // 1️⃣ Lấy toàn bộ danh sách nhân viên
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "ThongTin!A2:H",
  });

  const rows = res.data.values || [];
  const index = rows.findIndex((r) => r[1] === maThe);
  if (index === -1)
    return Response.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });

  // 2️⃣ Xóa dòng khỏi sheet ThongTin
  const startRow = index + 2;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: 0, // sheetId của ThongTin
              dimension: "ROWS",
              startIndex: startRow - 1,
              endIndex: startRow,
            },
          },
        },
      ],
    },
  });

  // 3️⃣ Thêm lại mã thẻ vào cuối bảng Waiting (chỉ cột A)
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "Waiting!A2",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[maThe]] },
  });

  return Response.json({ success: true });
}
