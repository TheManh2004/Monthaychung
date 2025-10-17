import { google } from "googleapis";

const SHEET_ID = "1MbHCyopMOW9r3FCClU3ZKcAXlUCfUSgZgmqFbDr8p6c";

export async function POST(req: Request) {
  try {
    const { cardId, password } = await req.json();
    if (!cardId || !password) {
      return Response.json(
        { success: false, message: "Thiếu mã thẻ hoặc mật khẩu" },
        { status: 400 }
      );
    }

    // 🔐 Kiểm tra mật khẩu = mã thẻ
    if (password !== cardId) {
      return Response.json({
        success: false,
        message: "Mật khẩu không chính xác",
      });
    }

    // ✅ Xác thực Google Sheets
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

    // ✅ Lấy dữ liệu từ sheet "ThongTin"
    const thongTin = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "ThongTin!A2:H",
    });

    const rows = thongTin.data.values || [];
    const found = rows.find((r) => r[1] === cardId); // cột B = Mã thẻ

    if (!found) {
      return Response.json({
        success: false,
        message: "Không tìm thấy tài khoản",
      });
    }

    const [, maThe, ten, sdt, ngaySinh, phongBan, vaiTro] = found;

    // ✅ Phân quyền dựa theo phòng ban & vai trò
    let role: "nhanvien" | "nhansu" | "giamdoc" = "nhanvien";
    const normalizedDept = phongBan
      ?.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (normalizedDept.includes("nhan su")) role = "nhansu";
    else if (normalizedDept.includes("giam doc")) role = "giamdoc";

    return Response.json({
      success: true,
      user: {
        maThe,
        ten,
        sdt,
        ngaySinh,
        phongBan,
        vaiTro,
        role,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}
