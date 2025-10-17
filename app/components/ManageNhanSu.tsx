"use client";
import { useState, useEffect, useTransition } from "react";
import {
  Table,
  Button,
  Input,
  Modal,
  Form,
  Popconfirm,
  App,
  Space,
} from "antd";

export default function ManageNhanSu() {
    const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null); // 🆕 đang sửa nhân viên nào
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const fetchData = async () => {
    startTransition(async () => {
    const res = await fetch("/api/nhansu");
    setData(await res.json());
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🧩 Mở modal thêm
  const handleAddOpen = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  // 🧩 Mở modal sửa
  const handleEditOpen = (record: any) => {
    setEditing(record);
    form.setFieldsValue({
      maThe: record[1],
      ten: record[2],
      sdt: record[3],
      ngaySinh: record[4],
      phongBan: record[5],
      vaiTro: record[6],
    });
    setOpen(true);
  };

  // 🧩 Gửi thêm/sửa
  const handleSubmit = async () => {
    const values = await form.validateFields();
    const method = editing ? "PUT" : "POST"; // nếu có editing → PUT
    startTransition(async () => {
    const res = await fetch("/api/nhansu", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      message.success(editing ? "Cập nhật thành công" : "Thêm thành công");
      setOpen(false);
      form.resetFields();
      setEditing(null);
      fetchData();
    } else {
        message.error("Không thể lưu dữ liệu");
      }
    });
  };

  const handleDelete = async (maThe: string) => {
    const res = await fetch(`/api/nhansu?maThe=${maThe}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success || res.ok) {
      message.success("Xóa thành công");
      fetchData();
    } else {
      message.error("Không thể xóa nhân viên");
    }
  };

  const columns = [
    { title: "Mã thẻ", dataIndex: 1, key: "maThe" },
    { title: "Tên", dataIndex: 2, key: "ten" },
    { title: "SĐT", dataIndex: 3, key: "sdt" },
    { title: "Ngày sinh", dataIndex: 4, key: "ngaySinh" },
    { title: "Phòng ban", dataIndex: 5, key: "phongBan" },
    { title: "Vai trò", dataIndex: 6, key: "vaiTro" },
    {
      title: "Hành động",
      key: "action",
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => handleEditOpen(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa nhân viên?"
            onConfirm={() => handleDelete(record[1])}
          >
            <Button danger size="small">
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between mb-3">
        <h3 className="font-semibold text-lg">Quản lý nhân viên</h3>
        <Button type="primary" onClick={handleAddOpen}>
          + Thêm nhân viên
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey={(r) => r[1]}
        pagination={{ pageSize: 8 }}
        loading={isPending}
      />

      <Modal
        open={open}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
        }}
        onOk={handleSubmit}
        title={editing ? "Sửa nhân viên" : "Thêm nhân viên mới"}
        okButtonProps={{ loading: isPending }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="maThe" label="Mã thẻ" rules={[{ required: true }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item name="ten" label="Tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sdt" label="SĐT">
            <Input />
          </Form.Item>
          <Form.Item name="ngaySinh" label="Ngày sinh">
            <Input placeholder="dd/mm/yyyy" />
          </Form.Item>
          <Form.Item name="phongBan" label="Phòng ban">
            <Input />
          </Form.Item>
          <Form.Item name="vaiTro" label="Vai trò">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
