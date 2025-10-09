"use client";
import { useEffect, useState } from "react";

export default function Page() {
  const [rows, setRows] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      fetch("/api/bangcong")
        .then((res) => res.json())
        .then((data) => {
          setRows(data.data || []);
          console.log(data.data);
          setLoading(false);
        });
    };
    fetchData();
    

    // cập nhật mỗi 10 giây
    const timer = setInterval(fetchData, 10000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <p className="p-6 text-center">Đang tải dữ liệu...</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6">
        BẢNG CHẤM CÔNG (DỮ LIỆU THỰC TỪ GOOGLE SHEET)
      </h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-400 text-sm">
          <thead className="bg-gray-100">
            <tr>
              {rows[0]?.map((header, idx) => (
                <th key={idx} className="border border-gray-400 p-2 text-left">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(1).map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                {r.map((cell, j) => (
                  <td key={j} className="border border-gray-300 p-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-gray-500 text-xs mt-4">
        Cập nhật tự động mỗi 10 giây
      </p>
    </div>
  );
}
