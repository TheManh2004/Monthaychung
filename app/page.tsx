"use client";

import { useState, useEffect } from "react";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import "dayjs/locale/vi";
import { DatePicker, Button, Space, Input } from "antd";
import locale from "antd/es/date-picker/locale/vi_VN";

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { RangePicker } = DatePicker;

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [cardId, setCardId] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(dayjs().format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState(dayjs().format("YYYY-MM-DD"));

  useEffect(() => {
    fetch("/api/bangcong")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  const handleSearch = () => {
    if (!data) return;
    const found = data.thongTin.find((r: string[]) => r[1] === cardId);
    if (!found) {
      setUser("NOT_FOUND");
      return;
    }
    const [, maThe, ten, sdt, ngaySinh, phongBan, vaiTro] = found;
    setUser({ maThe, ten, sdt, ngaySinh, phongBan, vaiTro });
  };

  if (loading) return <p className="p-6 text-center">Đang tải dữ liệu...</p>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6">
        BẢNG CHẤM CÔNG GOOGLE SHEETS
      </h1>

      <div className="flex gap-2 mb-4 justify-center">
        <Input
          value={cardId}
          onChange={(e) => setCardId(e.target.value)}
          placeholder="Nhập mã thẻ..."
          className="w-64"
        />
        <Button type="primary" onClick={handleSearch}>
          Tra cứu
        </Button>
      </div>

      {user === "NOT_FOUND" && (
        <p className="text-center text-red-500">❌ Không tìm thấy thẻ này</p>
      )}

      {user && user !== "NOT_FOUND" && (
        <UserView
          user={user}
          data={data}
          dateFrom={dateFrom}
          dateTo={dateTo}
          setDateFrom={setDateFrom}
          setDateTo={setDateTo}
        />
      )}
    </div>
  );
}

// ======================= COMPONENT HIỂN THỊ USER ========================
function UserView({ user, data, dateFrom, dateTo, setDateFrom, setDateTo }: any) {
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD") // bỏ dấu tiếng Việt
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ") // gom nhiều khoảng trắng
      .trim();
  
  const isManager = ["ke toan", "giam doc"].includes(normalize(user.phongBan));

  // parse ngày Google Sheet an toàn
  const parseNgay = (value: any) => {
    if (!value) return null;
    if (typeof value === "number") {
      return dayjs("1899-12-30").add(value, "day"); // serial date
    }
    const parsed = dayjs(value, ["DD/MM/YYYY", "YYYY-MM-DD", "MM/DD/YYYY"], true);
    return parsed.isValid() ? parsed : dayjs(value);
  };

  const handleFilter = () => {
    if (!data) return;

    const records = data.bangCong.slice(1);
    const from = dayjs(dateFrom);
    const to = dayjs(dateTo);

    const filtered = records.filter((r: string[]) => {
      const ngay = parseNgay(r[3]);
      const hasValidDate = ngay && ngay.isValid();
      const inRange = hasValidDate
        ? ngay.isSameOrAfter(from) && ngay.isSameOrBefore(to)
        : true; // Nếu không có ngày thì vẫn hiển thị
    
      if (isManager) return inRange; // Kế toán thấy tất cả
      return r[1] === user.maThe && inRange;
    });

    setFilteredData(filtered);
  };

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null]) => {
    if (!dates) return;
    setDateFrom(dates[0]?.format("YYYY-MM-DD"));
    setDateTo(dates[1]?.format("YYYY-MM-DD"));
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50 shadow">
      <h2 className="font-bold text-lg mb-3">{user.ten}</h2>
      <p>
        <strong>Phòng ban:</strong> {user.phongBan}
      </p>
      <p>
        <strong>Vai trò:</strong> {user.vaiTro}
      </p>

      {/* Bộ lọc ngày AntD */}
      <div className="mt-4 mb-4">
        <Space size="middle" wrap>
          <RangePicker
            locale={locale}
            format="DD-MM-YYYY"
            value={[dayjs(dateFrom), dayjs(dateTo)]}
            onChange={handleDateChange as any}
            allowClear={false}
          />
          <Button type="primary" onClick={handleFilter}>
            Lọc
          </Button>
        </Space>
      </div>

      {isManager ? (
        <ManagerTable data={filteredData} />
      ) : (
        <EmployeeTable data={filteredData} />
      )}
    </div>
  );
}

// ======================= NHÂN VIÊN XEM DỮ LIỆU ========================
function EmployeeTable({ data }: any) {
  const totalHours = data.reduce((sum: number, r: string[]) => {
    const inTime = dayjs(r[4], "HH:mm:ss");
    const outTime = dayjs(r[5], "HH:mm:ss");
    const diff = Math.abs(outTime.diff(inTime, "minute") / 60);
    return diff > 0 ? sum + diff : sum;
  }, 0);

  const totalDays = new Set(data.map((r: string[]) => r[3])).size;

  return (
    <>
      <h3 className="font-semibold mt-4 mb-2">Lịch sử chấm công</h3>
      <table className="w-full border-collapse border text-sm">
        <thead className="bg-gray-100">
          <tr>
            {["Ngày làm", "Giờ vào", "Giờ ra", "Ghi chú"].map((h) => (
              <th key={h} className="border p-2 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((r: string[], i: number) => (
              <tr key={i} className={i % 2 ? "bg-gray-50" : ""}>
                <td className="border p-2">
                  {dayjs(r[3], ["DD/MM/YYYY", "YYYY-MM-DD"]).format("DD/MM/YYYY")}
                </td>
                <td className="border p-2">{r[4]}</td>
                <td className="border p-2">{r[5]}</td>
                <td className="border p-2">{r[7]}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="text-center p-3">
                Không có dữ liệu
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-3 font-medium">
        <p>📅 Tổng ngày làm: {totalDays}</p>
        <p>⏱ Tổng giờ làm: {totalHours.toFixed(2)} giờ</p>
      </div>
    </>
  );
}

// ======================= GIÁM ĐỐC / KẾ TOÁN ========================
function ManagerTable({ data }: any) {
  const [filterName, setFilterName] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterCard, setFilterCard] = useState("");

  const filtered = data.filter((r: string[]) => {
    const matchName =
      !filterName || r[2]?.toLowerCase().includes(filterName.toLowerCase());
    const matchCard =
      !filterCard || r[1]?.toLowerCase().includes(filterCard.toLowerCase());
    const matchDept =
      !filterDept || r[6]?.toLowerCase().includes(filterDept.toLowerCase());
    return matchName && matchCard && matchDept;
  });

  const summaryMap: Record<
    string,
    { name: string; dept: string; days: number; hours: number }
  > = {};
  filtered.forEach((r: string[]) => {
    const key = r[1];
    const inTime = dayjs(r[4], "HH:mm:ss");
    const outTime = dayjs(r[5], "HH:mm:ss");
    const diff = Math.abs(outTime.diff(inTime, "minute") / 60);
    if (!summaryMap[key]) {
      summaryMap[key] = { name: r[2], dept: r[6], days: 0, hours: 0 };
    }
    summaryMap[key].days++;
    summaryMap[key].hours += diff > 0 ? diff : 0;
  });

  const summary = Object.entries(summaryMap).map(([key, val]) => ({
    ma: key,
    ...val,
  }));

  return (
    <>
      <h3 className="font-semibold mt-4 mb-2">Báo cáo tổng hợp</h3>

      <div className="flex flex-wrap gap-2 mb-3">
        <Input
          placeholder="Tìm mã thẻ"
          value={filterCard}
          onChange={(e) => setFilterCard(e.target.value)}
          className="w-48"
        />
        <Input
          placeholder="Tìm tên"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          className="w-48"
        />
     
      </div>

      <table className="w-full border-collapse border text-sm">
        <thead className="bg-gray-100">
          <tr>
            {["Mã", "Tên", "Lịch sử chấm công", "Số ngày làm", "Tổng giờ làm"].map((h) => (
              <th key={h} className="border p-2 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {summary.length > 0 ? (
            summary.map((r, i) => (
              <tr key={i} className={i % 2 ? "bg-gray-50" : ""}>
                <td className="border p-2">{r.ma}</td>
                <td className="border p-2">{r.name}</td>
                <td className="border p-2">{r.dept}</td>
                <td className="border p-2">{r.days}</td>
                <td className="border p-2">{r.hours.toFixed(2)} giờ</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="text-center p-3">
                Không có dữ liệu
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
