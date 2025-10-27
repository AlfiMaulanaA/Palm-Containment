Berikut versi **README.md** yang sudah dirapikan, diperjelas, dan diformat sesuai standar dokumentasi profesional GitHub.
Struktur difokuskan pada keterbacaan, alur penggunaan, serta pemahaman teknis lengkap.

---

````{"id":"57214","variant":"standard","title":"README.md – Palm Recognition with MQTT"}
# 🖐️ Palm Recognition System with MQTT Integration

Sistem **Palm Recognition** ini menggunakan sensor **IR** dan **RGB** untuk mendeteksi dan mengenali telapak tangan.  
Fitur mencakup pendaftaran pengguna (registration), pengenalan otomatis (recognition), dan komunikasi data berbasis **MQTT** untuk integrasi dengan sistem lain.

---

## 🔧 1. Deskripsi Umum

Program mendeteksi telapak tangan (palm recognition) menggunakan sensor **IR** dan **RGB**.  
Sistem akan:
- Mengekstrak fitur biometrik dari telapak tangan.
- Menyimpan gambar IR dan RGB.
- Melakukan pendaftaran (`regist`) atau pencocokan (`recognition`) terhadap database SQLite.
- Berkomunikasi dengan **MQTT Broker** untuk menerima perintah dan mengirimkan hasil pengenalan.

---

## 📸 2. Penyimpanan Gambar IR & RGB

Setiap kali sistem mendeteksi telapak tangan **valid**, baik terdaftar maupun tidak:
- Menyimpan gambar RGB → `1.rgb.png`
- Menyimpan gambar IR → `1.ir.png`
- Menampilkan visualisasi melalui fungsi internal:
  - `viewer_->ShowRgbImage_()`
  - `viewer_->ShowU8Image_()`

---

## 🔌 3. Konfigurasi MQTT

File konfigurasi: **`mqtt_config.json`**

```json
{
  "enable": true,
  "broker_address": "localhost",
  "broker_port": 1883,
  "username": "1",
  "password": "3",
  "qos": 1,
  "retain": false,
  "pub_topic_status": "palm/status",
  "pub_topic_result": "palm/compare/result",
  "sub_topic": "palm/control"
}
```

### Penjelasan Field
| Field | Deskripsi |
|-------|------------|
| `enable` | Aktifkan atau nonaktifkan koneksi MQTT |
| `broker_address` | Alamat MQTT broker |
| `broker_port` | Port broker MQTT (default: 1883) |
| `username` / `password` | Kredensial autentikasi |
| `qos` | Quality of Service MQTT |
| `retain` | Menandai pesan agar disimpan oleh broker |
| `pub_topic_status` | Topik untuk status operasional |
| `pub_topic_result` | Topik hasil pengenalan |
| `sub_topic` | Topik untuk menerima perintah dari sistem luar |

---

## 🔗 4. Komunikasi MQTT

### Proses Inisialisasi
1. Membaca konfigurasi dari `mqtt_config.json`.
2. Menginisialisasi koneksi ke MQTT broker.
3. Subscribe ke `sub_topic` untuk menerima perintah.
4. Publish pesan status awal ke `pub_topic_status`.

### Topik MQTT Utama
| Jenis | Topik | Arah | Format Payload |
|-------|--------|------|----------------|
| Command | `palm/control` | Subscribe | JSON (`command`, `user_id`) |
| Status | `palm/status` | Publish | JSON (`status`, `message`) |
| Result | `palm/compare/result` | Publish | JSON (`user`, `score`, `timestamp`) |

---

## 🧭 5. Daftar Perintah yang Didukung

### 1. Registrasi (`regist`)
```json
{
  "command": "regist",
  "user_id": "user123"
}
```
> Memasuki mode pendaftaran.  
> Fitur IR dan RGB disimpan ke database jika palm valid terdeteksi.

### 2. Hapus Data (`delete`)
```json
{
  "command": "delete",
  "user_id": "user123"
}
```
> Menghapus data pengguna dari database SQLite.

---

## 📤 6. Format Publish MQTT

### a. Status (`pub_topic_status`)
```json
{"status": "ok", "message": "PalmDevice is ready"}
{"status": "failed", "message": "SQL prepare error"}
```

| Field | Keterangan |
|--------|-------------|
| `status` | "ok" atau "failed" |
| `message` | Pesan status sistem |

### b. Hasil Pencocokan (`pub_topic_result`)
```json
{
  "user": "user123",
  "score": 0.9273,
  "timestamp": "2025-05-23T10:30:12Z"
}
```

| Field | Keterangan |
|--------|-------------|
| `user` | ID pengguna dengan kecocokan terbaik |
| `score` | Nilai rata-rata kecocokan IR + RGB (0.0 – 1.0) |
| `timestamp` | Waktu hasil dikirim |

> **Catatan:** Publish hanya dilakukan jika *publish delay* terpenuhi dan nilai skor valid.

---

## 🧾 7. Daftar Status (`pub_topic_status`)

| Status | Contoh Payload | Penyebab |
|--------|----------------|-----------|
| ✅ Ready | `{"status": "ok", "message": "PalmDevice is ready"}` | Inisialisasi dan koneksi MQTT sukses |
| ✅ Regist Mode | `{"status": "ok", "message": "successfully set to regist mode"}` | Perintah `regist` diterima dan valid |
| ✅ User Registered | `{"status": "ok", "message": "user successfully registered"}` | Data fitur palm tersimpan |
| ✅ User Deleted | `{"status": "ok", "message": "user deleted"}` | Data pengguna berhasil dihapus |
| ❌ Sudah Terdaftar | `{"status": "failed", "message": "user already registered"}` | User sudah ada di database |
| ❌ user_id Hilang (Regist) | `{"status": "failed", "message": "'user_id' missing in regist command"}` | Field `user_id` tidak ditemukan |
| ❌ user_id Hilang (Delete) | `{"status": "failed", "message": "'user_id' missing for delete command"}` | Field `user_id` tidak ditemukan |
| ❌ SQL Error | `{"status": "failed", "message": "SQL prepare error"}` | Kesalahan query atau struktur database |
| ❌ Database Gagal Dibuka | `{"status": "failed", "message": "Failed to open database"}` | File `palm_feature.db` rusak / tidak ada |

---

## 🧠 8. Mode Operasi

| Mode | Fungsi |
|------|---------|
| **Regist** | Menyimpan fitur IR + RGB ke database |
| **Recognition** | Mencocokkan dengan database dan kirim hasil ke MQTT |
| **Auto Save** | Menyimpan gambar `.png` setiap kali palm valid terdeteksi |

---

## 🗄️ 9. Database SQLite

- **Nama file:** `palm_feature.db`
- **Tabel:** `Usr`
- **Struktur:**

| Kolom | Tipe | Keterangan |
|--------|------|-------------|
| `id` | TEXT | ID pengguna |
| `ir_feature` | TEXT | Data fitur IR |
| `rgb_feature` | TEXT | Data fitur RGB |

---

## 🔄 10. Siklus Operasi Sistem

1. Deteksi palm (IR + RGB)
2. Jika palm valid:
   - Simpan gambar IR dan RGB
   - Jika mode **regist** aktif → simpan fitur ke database
   - Jika mode **recognition** aktif → bandingkan dengan database
   - Publish hasil ke `palm/compare/result`
3. Update status ke `palm/status`

---

## ⚙️ 11. Menjalankan Program Secara Manual

### 1. Masuk ke Direktori Build
```bash
cd ~/palm-sdk-vp930pro-linux-aarch64-v1.3.41-P_20250505/samples/src/sample/build
```

### 2. Jalankan Program
```bash
./palm_test
```

### 3. Pastikan
- File `mqtt_config.json` ada di direktori yang sama.
- File konfigurasi hardware sensor tersedia di folder `config/`.
- File `palm_feature.db` akan otomatis dibuat saat registrasi pertama berhasil.

---

## 🧩 12. Debugging & Testing MQTT

### Melihat Status Real-Time
```bash
mosquitto_sub -t palm/status -v
```

### Mengirim Perintah Registrasi
```bash
mosquitto_pub -t palm/control -m '{"command": "regist", "user_id": "user123"}'
```

### Menghapus User
```bash
mosquitto_pub -t palm/control -m '{"command": "delete", "user_id": "user123"}'
```

### Melihat Hasil Pengenalan
```bash
mosquitto_sub -t palm/compare/result -v
```

---

## 🧰 13. Tips Tambahan

- Semua payload dikirim dalam **format JSON string**.
- Jika status `failed` sering muncul:
  - Cek struktur `mqtt_config.json`.
  - Periksa izin akses ke file database.
  - Pastikan payload MQTT valid.
- Gunakan *log viewer* atau terminal MQTT client seperti **MQTT Explorer** untuk monitoring.

---

## 📅 Versi
- SDK: `vp930pro-linux-aarch64-v1.3.41-P_20250505`
- Palm Recognition Program: `v1.0.0`
- MQTT Supported: Yes (configurable via `mqtt_config.json`)

---

## 👨‍💻 Kontributor
- **Alfi Maulana Alfarisi** – IoT Engineer & Software Developer  
  PT Graha Sumber Prima Elektronik

---

## 📄 Lisensi
Dokumentasi dan kode bersifat internal untuk pengembangan sistem biometrik berbasis MQTT.  
Penggunaan di luar lingkup proyek harus mendapat izin tertulis.

---
````
