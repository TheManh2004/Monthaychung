"use client";

import { useState, useEffect } from "react";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import "dayjs/locale/vi";
import {
  DatePicker,
  Button,
  Space,
  Input,
  Table,
  Tag,
  Card,
  Statistic,
  Row,
  Col,
} from "antd";
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
  const [dateFrom, setDateFrom] = useState(dayjs().subtract(6, "day").format("YYYY-MM-DD"));
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
    <div className="p-6 max-w-7xl mx-auto">
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

// ======================= HÀM CHUNG PARSE CẶP RA/VAO ========================
function parsePairs(lichSu: string) {
  const regex = /(VAO|RA)\s+(\d{1,2}:\d{2}:\d{2})/g;
  const matches = [...(lichSu || "").matchAll(regex)];

  const pairs: { in: string; out: string }[] = [];
  const stack: string[] = [];

  for (const m of matches) {
    const type = m[1];
    const time = m[2];

    if (type === "VAO") {
      if (stack.length === 0) stack.push(time);
      else stack[0] = time; // nếu nhiều VAO liên tiếp, giữ cái mới
    } else if (type === "RA" && stack.length > 0) {
      const vaoTime = stack.shift()!;
      const vao = dayjs(vaoTime, "HH:mm:ss");
      const ra = dayjs(time, "HH:mm:ss");
      if (ra.isAfter(vao)) {
        pairs.push({ in: vaoTime, out: time });
      }
    }
  }

  // Nếu còn sót VAO chưa RA
  if (stack.length > 0) {
    pairs.push({ in: stack[0], out: "Chưa RA" });
  }

  return pairs;
}

// ======================= USER VIEW ========================
function UserView({ user, data, dateFrom, dateTo, setDateFrom, setDateTo }: any) {
  const [filteredData, setFilteredData] = useState<any[]>([]);

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const isManager = ["nhan su", "giam doc"].includes(normalize(user.phongBan));

  const parseNgay = (value: any) => {
    if (!value) return null;
    if (typeof value === "number") {
      return dayjs("1899-12-30").add(value, "day");
    }
    const parsed = dayjs(value, ["DD/MM/YYYY", "YYYY-MM-DD"], true);
    return parsed.isValid() ? parsed : dayjs(value);
  };

  const handleFilter = () => {
    if (!data) return;
    const records = data.bangCong.slice(1);
    const from = dayjs(dateFrom);
    const to = dayjs(dateTo);

    const filtered = records.filter((r: string[]) => {
      const ngay = parseNgay(r[3]);
      const inRange =
        ngay && ngay.isValid()
          ? ngay.isSameOrAfter(from) && ngay.isSameOrBefore(to)
          : true;
      if (isManager) return inRange;
      return r[1] === user.maThe && inRange;
    });

    setFilteredData(filtered);
  };

  useEffect(() => {
    handleFilter();
  }, [data]);

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null]) => {
    if (!dates) return;
    setDateFrom(dates[0]?.format("YYYY-MM-DD"));
    setDateTo(dates[1]?.format("YYYY-MM-DD"));
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50 shadow">
      <h2 className="font-bold text-lg mb-2">{user.ten}</h2>
      <p>
        <strong>Phòng ban:</strong> {user.phongBan}
      </p>
      <p>
        <strong>Vai trò:</strong> {user.vaiTro}
      </p>

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

// ======================= NHÂN VIÊN ========================
function EmployeeTable({ data }: any) {
  if (!data?.length) return <p className="text-center">Không có dữ liệu</p>;

  // nhóm theo ngày, dùng LichSu (cột G)
  const groupedByDay: Record<string, any[]> = {};
  data.forEach((r: string[]) => {
    const date = dayjs(r[3], ["DD/MM/YYYY", "YYYY-MM-DD"]).format("DD/MM/YYYY");
    const lichSu = r[6] || "";
    const pairs = parsePairs(lichSu);
    if (!groupedByDay[date]) groupedByDay[date] = [];
    groupedByDay[date].push(...pairs);
  });

  const tableData = Object.entries(groupedByDay).map(([date, sessions]: any) => {
    const total = sessions.reduce((sum: number, s: any) => {
      if (s.out === "Chưa RA") return sum;
      const diff = dayjs(s.out, "HH:mm:ss").diff(dayjs(s.in, "HH:mm:ss"), "minute") / 60;
      return sum + (diff > 0 ? diff : 0);
    }, 0);
    return { key: date, date, sessions, hours: total.toFixed(2) };
  });

  const totalHours = tableData.reduce((sum, r) => sum + parseFloat(r.hours), 0);
  const totalDays = tableData.length;

  const columns = [
    { title: "Ngày làm", dataIndex: "date", key: "date", width: 120 },
    {
      title: "Lịch sử RA/VAO",
      dataIndex: "sessions",
      key: "sessions",
      render: (sessions: any[]) =>
        sessions.map((s, i) => (
          <Tag
            key={i}
            color={s.out === "Chưa RA" ? "volcano" : i % 2 ? "blue" : "green"}
            style={{ marginBottom: 4, fontWeight: 500 }}
          >
            {s.in} → {s.out}
          </Tag>
        )),
    },
    { title: "Tổng giờ", dataIndex: "hours", key: "hours", width: 100 },
  ];

  return (
    <>
      <Row gutter={16} className="mb-4">
        <Col span={12}>
          <Card>
            <Statistic title="Số ngày làm" value={totalDays} />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic title="Tổng giờ làm" value={totalHours.toFixed(2)} suffix="giờ" />
          </Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={tableData}
        pagination={{ pageSize: 10 }}
        bordered
        size="small"
      />
    </>
  );
}

// ======================= GIÁM ĐỐC / NHÂN SỰ ========================
function ManagerTable({ data }: any) {
  const [filterName, setFilterName] = useState("");
  const [filterCard, setFilterCard] = useState("");
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  const filtered = data.filter((r: string[]) => {
    const matchName = !filterName || r[2]?.toLowerCase().includes(filterName.toLowerCase());
    const matchCard = !filterCard || r[1]?.toLowerCase().includes(filterCard.toLowerCase());
    return matchName && matchCard;
  });

  const summaryMap: Record<
    string,
    { name: string; dept: string; days: number; hours: number; details: Record<string, any[]> }
  > = {};

  filtered.forEach((r: string[]) => {
    const key = r[1];
    const name = r[2];
    const dept = r[6] || "";
    const ngay = dayjs(r[3], ["DD/MM/YYYY", "YYYY-MM-DD"]).format("DD/MM/YYYY");
    const lichSu = r[6] || ""; // chính xác: cột G

    const pairs = parsePairs(lichSu);

    if (!summaryMap[key]) {
      summaryMap[key] = { name, dept, days: 0, hours: 0, details: {} };
    }
    if (!summaryMap[key].details[ngay]) summaryMap[key].details[ngay] = [];

    summaryMap[key].details[ngay].push(...pairs);

    const total = pairs.reduce((sum, s) => {
      if (s.out === "Chưa RA") return sum;
      const diff = dayjs(s.out, "HH:mm:ss").diff(dayjs(s.in, "HH:mm:ss"), "minute") / 60;
      return sum + (diff > 0 ? diff : 0);
    }, 0);
    summaryMap[key].hours += total;
  });

  Object.values(summaryMap).forEach((val) => {
    val.days = Object.keys(val.details).length;
  });

  const summary = Object.entries(summaryMap).map(([key, val]) => ({ key, ma: key, ...val }));

  const totalDays = summary.reduce((sum, s) => sum + s.days, 0);
  const totalHours = summary.reduce((sum, s) => sum + s.hours, 0);

  const columns = [
    { title: "Mã", dataIndex: "ma", key: "ma", width: 130 },
    { title: "Tên", dataIndex: "name", key: "name", width: 150 },
    {
      title: "Lịch sử RA/VAO",
      key: "lichsu",
      width: 350,
      render: (_: any, record: any) => {
        const recentDate = Object.keys(record.details).sort().reverse()[0];
        const sessions = record.details[recentDate] || [];
        if (!sessions.length)
          return <span className="text-gray-400 italic">Chưa có dữ liệu</span>;

        return (
          <div className="flex flex-wrap gap-1">
            {sessions.map((s: any, i: number) => (
              <Tag
                key={i}
                color={s.out === "Chưa RA" ? "volcano" : i % 2 === 0 ? "green" : "blue"}
                style={{ fontWeight: 500 }}
              >
                {s.in} → {s.out}
              </Tag>
            ))}
          </div>
        );
      },
    },
    { title: "Số ngày", dataIndex: "days", key: "days", width: 80 },
    {
      title: "Tổng giờ",
      dataIndex: "hours",
      key: "hours",
      width: 100,
      render: (v: number) => `${v.toFixed(2)} giờ`,
    },
  ];

  return (
    <>
      <Row gutter={16} className="mb-4">
        <Col span={8}>
          <Card><Statistic title="Tổng nhân viên" value={summary.length} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="Tổng ngày công" value={totalDays} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="Tổng giờ làm" value={totalHours.toFixed(2)} suffix="giờ" /></Card>
        </Col>
      </Row>

      <div className="flex gap-2 my-4">
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

      <Table
        rowKey="key"
        columns={columns}
        dataSource={summary}
        bordered
        pagination={{ pageSize: 10 }}
        size="small"
        expandable={{
          expandedRowKeys,
          onExpand: (expanded, record) => {
            setExpandedRowKeys(expanded ? [record.key] : []);
          },
          expandedRowRender: (record) => (
            <div>
              {Object.entries(record.details).map(([date, sessions]: any) => (
                <div key={date} className="mb-2">
                  <div className="font-semibold text-blue-600 mb-1">{date}</div>
                  <div className="flex flex-wrap gap-1">
                    {sessions.map((s: any, i: number) => (
                      <Tag
                        key={i}
                        color={s.out === "Chưa RA" ? "volcano" : i % 2 === 0 ? "green" : "blue"}
                        style={{ fontWeight: 500 }}
                      >
                        {s.in} → {s.out}
                      </Tag>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ),
        }}
      />
    </>
  );
}
