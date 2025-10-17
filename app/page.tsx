"use client";
import { useEffect, useState } from "react";
import { Button, Tabs } from "antd";
import type { TabsProps } from "antd";
import ManageNhanSu from "./components/ManageNhanSu";
import ExistingMainPage from "./ExistingMainPage";

export default function Page() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) {
      window.location.href = "/login";
    } else {
      setUser(JSON.parse(u));
    }
  }, []);

  if (!user) return <p className="p-6 text-center">Đang kiểm tra đăng nhập...</p>;

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  // 🧩 Khi là "nhân sự" thì hiển thị Tabs
  const items: TabsProps["items"] =
    user.role === "nhansu"
      ? [
          {
            key: "1",
            label: "📊 Bảng chấm công toàn bộ (Manager View)",
            children: <ExistingMainPage user={user} />,
          },
          {
            key: "2",
            label: "👥 Quản lý nhân viên",
            children: <ManageNhanSu />,
          },
        ]
      : [
          {
            key: "1",
            label: "📊 Bảng chấm công",
            children: <ExistingMainPage user={user} />,
          },
        ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Xin chào, {user.ten}</h1>
        <Button onClick={handleLogout}>Đăng xuất</Button>
      </div>

      <Tabs defaultActiveKey="1" items={items} />
    </div>
  );
}
