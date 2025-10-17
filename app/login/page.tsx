"use client";
import { useState } from "react";
import { Input, Button, Card, App } from "antd";

export default function LoginPage() {
  const [cardId, setCardId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  const handleLogin = async () => {
    if (!cardId || !password) {
      message.warning("Vui lòng nhập đầy đủ mã thẻ và mật khẩu");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!data.success) {
      message.error(data.message || "Đăng nhập thất bại");
      return;
    }

    // ✅ Lưu vào localStorage
    localStorage.setItem("user", JSON.stringify(data.user));
    message.success("Đăng nhập thành công");

    // ✅ Chuyển hướng
    window.location.href = "/";
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card title="Đăng nhập chấm công" className="w-96 shadow-md">
        <Input
          placeholder="Nhập mã thẻ"
          value={cardId}
          onChange={(e) => setCardId(e.target.value)}
          className="mb-3"
        />
        <Input.Password
          placeholder="Nhập mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-3"
          style={{ marginTop: "10px" }}
        />
        <Button type="primary" loading={loading} onClick={handleLogin} block>
          Đăng nhập
        </Button>
      </Card>
    </div>
  );
}
