# Hướng Dẫn Toàn Diện Về NGINX Log & Phân Tích Bằng Linux CLI (grep, awk, sed) và GoAccess

Tài liệu này cung cấp hướng dẫn đầy đủ từ cơ bản đến nâng cao về hệ thống ghi nhật ký (logging) của **NGINX Web Server / Reverse Proxy**, các câu lệnh Linux dòng lệnh chuyên sâu để điều tra dữ liệu truy cập và phương pháp sử dụng công cụ trực quan hóa **GoAccess**.

---

## 📑 Mục Lục
1. [Vị Trí File Log Mặc Định](#1-vị-trí-file-log-mặc-định)
2. [Cấu Trúc & Giải Thích Chi Tiết `log_format`](#2-cấu-trúc--giải-thích-chi-tiết-log_format)
3. [Các Câu Lệnh Bash Phân Tích Log Chuyên Sâu (grep, awk, sed)](#3-các-câu-lệnh-bash-phân-tích-log-chuyên-sâu)
   - [Lọc người truy cập và địa chỉ IP](#31-lọc-người-truy-cập-và-địa-chỉ-ip)
   - [Lọc theo ngày, giờ và khoảng thời gian (Yêu cầu ngày 28/09)](#32-lọc-theo-ngày-giờ-và-khoảng-thời-gian)
   - [Lọc theo Mã trạng thái HTTP (Status Code)](#33-lọc-theo-mã-trạng-thái-http-status-code)
   - [Lọc theo User-Agent (Thiết bị, Bot, Công cụ quét)](#34-lọc-theo-user-agent)
   - [Lọc URL và hiệu năng phản hồi (Slow Request)](#35-lọc-url-và-hiệu-năng-phản-hồi)
4. [Hướng Dẫn Phân Tích & Trực Quan Hóa Với GoAccess](#4-hướng-dẫn-sử-dụng-công-cụ-trực-quan-goaccess)
   - [Cài đặt GoAccess](#41-cài-đặt-goaccess)
   - [Chế độ Interactive TUI trên Terminal](#42-chế-độ-interactive-tui-trên-terminal)
   - [Xuất báo cáo HTML trực quan](#43-xuất-báo-cáo-html-trực-quan)
   - [Bảng điều khiển Real-time HTML qua WebSocket](#44-bảng-điều-khiển-real-time-html-dashboard)
   - [Cấu hình file `goaccess.conf`](#45-cấu-hình-file-goaccessconf)
   - [Chạy GoAccess qua Docker](#46-chạy-goaccess-qua-docker)

---

## 1. Vị Trí File Log Mặc Định

Theo chuẩn cài đặt NGINX trên hầu hết các bản phân phối Linux (Ubuntu, Debian, CentOS, RHEL, Alpine):

| Tên File Log | Đường Dẫn Mặc Định | Chức Năng |
| :--- | :--- | :--- |
| **Access Log** | `/var/log/nginx/access.log` | Ghi nhận **mọi yêu cầu HTTP/HTTPS** từ client gửi tới server (IP, URL, mã phản hồi, thời gian...). |
| **Error Log** | `/var/log/nginx/error.log` | Ghi nhận các **lỗi vận hành** (khởi động thất bại, cú pháp sai, upstream Node.js chết, connection refused, 403 Forbidden do quyền file...). |

### Cấu hình trong NGINX (`/etc/nginx/nginx.conf`):
```nginx
http {
    # Định nghĩa khuôn mẫu log
    log_format combined '$remote_addr - $remote_user [$time_local] '
                        '"$request" $status $body_bytes_sent '
                        '"$http_referer" "$http_user_agent"';

    # Chỉ định vị trí lưu trữ file
    access_log /var/log/nginx/access.log combined;
    error_log  /var/log/nginx/error.log warn;
}
```

> [!TIP]
> Trong môi trường container Docker, NGINX thường chuyển hướng log ra stdout và stderr để Docker thu thập:
> - `access.log` -> `/dev/stdout`
> - `error.log` -> `/dev/stderr`

---

## 2. Cấu Trúc & Giải Thích Chi Tiết `log_format`

### 2.1. Định dạng Combined chuẩn mặc định
NGINX sử dụng định dạng `combined` (kế thừa từ chuẩn NCSA Common Log Format):

```nginx
log_format combined '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent"';
```

### 2.2. Ví dụ một dòng log thực tế
```text
192.168.1.105 - gv_nam [28/Sep/2026:14:35:22 +0700] "GET /api/sinhvien?page=1&limit=10 HTTP/1.1" 200 4826 "https://portal.school.edu.vn/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
```

### 2.3. Bảng phân tích chi tiết từng trường dữ liệu:

| Thứ tự | Trường / Biến | Giá trị trong ví dụ | Ý nghĩa chi tiết |
| :---: | :--- | :--- | :--- |
| **1** | `$remote_addr` | `192.168.1.105` | Địa chỉ IP của máy client gửi request. |
| **2** | `-` (identd) | `-` | Trường định danh cũ theo chuẩn CLF, thường luôn là `-`. |
| **3** | `$remote_user` | `gv_nam` | Tên tài khoản xác thực qua HTTP Basic Auth. Nếu không dùng sẽ hiển thị dấu `-`. |
| **4** | `[$time_local]` | `[28/Sep/2026:14:35:22 +0700]` | Thời điểm nhận request theo giờ máy chủ (`dd/Mon/yyyy:hh:mm:ss ±timezone`). |
| **5** | `"$request"` | `"GET /api/sinhvien... HTTP/1.1"` | Toàn bộ dòng yêu cầu từ client, gồm 3 phần: **Method** (`GET`), **URI** (`/api/...`), **Giao thức** (`HTTP/1.1`). |
| **6** | `$status` | `200` | Mã trạng thái phản hồi HTTP gửi lại cho client (200, 301, 400, 401, 403, 404, 500...). |
| **7** | `$body_bytes_sent` | `4826` | Dung lượng (byte) của phần nội dung (response body) trả về, không bao gồm HTTP header. |
| **8** | `"$http_referer"` | `"https://portal.school..."` | URL trang trước đó chứa link dẫn người dùng tới request này. Nếu gõ trực tiếp URL sẽ là `"-"`. |
| **9** | `"$http_user_agent"`| `"Mozilla/5.0..."` | Chuỗi nhận diện trình duyệt, hệ điều hành, thiết bị hoặc phần mềm gọi API (curl, Postman, Googlebot...). |

### 2.4. Các biến nâng cao cho Reverse Proxy (ExpressJS / Backend API)
Khi NGINX làm Reverse Proxy đứng trước ExpressJS, nên bổ sung định dạng log nâng cao:
```nginx
log_format custom_api '$remote_addr - $remote_user [$time_local] '
                      '"$request" $status $body_bytes_sent '
                      '"$http_referer" "$http_user_agent" '
                      'rt=$request_time uct="$upstream_connect_time" uht="$upstream_header_time" urt="$upstream_response_time"';
```
- `$request_time`: Tổng thời gian xử lý toàn bộ request từ lúc đọc byte đầu tiên của client đến lúc gửi byte cuối cùng (tính bằng giây, độ chính xác mili-giây, VD: `0.024`).
- `$upstream_response_time`: Thời gian backend ExpressJS cần để xử lý dữ liệu và phản hồi lại NGINX.
- `$upstream_addr`: Địa chỉ backend xử lý (VD: `127.0.0.1:3000`).
- `$http_x_forwarded_for`: Địa chỉ IP gốc của người dùng khi request đi qua proxy trung gian hoặc Cloudflare.

---

## 3. Các Câu Lệnh Bash Phân Tích Log Chuyên Sâu

Các câu lệnh sau chạy trên terminal Linux (Ubuntu, Debian, macOS, hoặc Git Bash/WSL):

### 3.1. Lọc người truy cập và địa chỉ IP

#### 1. Đếm tổng số lượng IP duy nhất truy cập:
```bash
awk '{print $1}' /var/log/nginx/access.log | sort -u | wc -l
```

#### 2. Top 10 địa chỉ IP truy cập nhiều nhất (Phát hiện DoS / Spam request):
```bash
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -n 10
```
*Kết quả mẫu:*
```text
  1524 192.168.1.105
   842 14.161.22.88
   530 113.160.15.12
```

#### 3. Lọc toàn bộ lịch sử truy cập của một địa chỉ IP cụ thể:
```bash
grep "^192.168.1.105" /var/log/nginx/access.log
```

#### 4. Lọc các request có tài khoản đăng nhập xác thực (`$remote_user` khác `-`):
```bash
awk '$3 != "-" {print $1, $3, $7, $9}' /var/log/nginx/access.log
```

---

### 3.2. Lọc theo ngày, giờ và khoảng thời gian

#### 1. Lọc tất cả request trong ngày 28/09 (28/Sep):
```bash
grep "28/Sep" /var/log/nginx/access.log
```

#### 2. Đếm tổng số lượt request trong ngày 28/09:
```bash
grep -c "28/Sep" /var/log/nginx/access.log
```

#### 3. Lọc các request trong một khung giờ cụ thể ngày 28/09 (Ví dụ từ 14:00:00 đến 14:59:59):
```bash
grep "28/Sep/2026:14:" /var/log/nginx/access.log
```

#### 4. Thống kê biểu đồ lưu lượng theo từng giờ trong ngày 28/09:
```bash
grep "28/Sep" /var/log/nginx/access.log | awk '{print $4}' | cut -d: -f2 | sort | uniq -c
```
*Kết quả mẫu:*
```text
    45 08  (45 request lúc 8h sáng)
   120 09
   350 14  (350 request lúc 14h chiều)
```

#### 5. Trích xuất khoảng thời gian chính xác giữa 2 mốc thời gian bằng `sed`:
```bash
sed -n '/28\/Sep\/2026:14:15:00/,/28\/Sep\/2026:14:30:00/p' /var/log/nginx/access.log
```

---

### 3.3. Lọc theo Mã trạng thái HTTP (Status Code)

#### 1. Thống kê tỷ lệ phân bố các mã Status Code trong toàn bộ file log:
```bash
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -nr
```
*Kết quả mẫu:*
```text
  12500 200
    340 404
    120 401
     45 403
     12 500
```

#### 2. Tìm tất cả các request bị lỗi máy chủ 500 (Internal Server Error):
```bash
awk '$9 == "500" {print $1, $4, $6, $7}' /var/log/nginx/access.log
```

#### 3. Tìm các địa chỉ IP gây ra lỗi 500 nhiều nhất:
```bash
awk '$9 == "500" {print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr
```

#### 4. Lọc các URL bị lỗi 404 Not Found (Phát hiện hacker scan file `.env`, `.git`, `phpmyadmin`):
```bash
awk '$9 == "404" {print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -n 15
```

#### 5. Lọc các request bị chặn quyền 401/403 (liên quan đến kiểm tra RBAC Permission):
```bash
awk '$9 ~ /^(401|403)$/ {print $1, $4, $6, $7, "Code:" $9}' /var/log/nginx/access.log
```

---

### 3.4. Lọc theo User-Agent

#### 1. Thống kê Top 10 User-Agent truy cập nhiều nhất:
```bash
awk -F'"' '{print $6}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -n 10
```

#### 2. Phát hiện và lọc các công cụ tự động, Bot hoặc Tool kiểm thử API (curl, Postman, Python):
```bash
grep -Ei "curl|postman|python|wget|insomnia" /var/log/nginx/access.log
```

#### 3. Thống kê lượt truy cập của các bot tìm kiếm (Googlebot, Bingbot, Yahoo):
```bash
grep -Ei "googlebot|bingbot|yandex|duckduckgo" /var/log/nginx/access.log | wc -l
```

#### 4. Lọc các request có User-Agent rỗng hoặc là `-` (Dấu hiệu của script tự chế):
```bash
awk -F'"' '$6 == "-" || $6 == "" {print $1, $4, $9}' /var/log/nginx/access.log
```

---

### 3.5. Lọc URL và hiệu năng phản hồi

#### 1. Top 10 Endpoint API được gọi nhiều nhất:
```bash
awk '{print $7}' /var/log/nginx/access.log | cut -d? -f1 | sort | uniq -c | sort -nr | head -n 10
```

#### 2. Thống kê số lượng gọi theo phương thức HTTP (`GET`, `POST`, `PUT`, `DELETE`):
```bash
awk '{print $6}' /var/log/nginx/access.log | tr -d '"' | sort | uniq -c
```

#### 3. Tìm các request chậm nhất nếu có ghi `$request_time` (giả sử ở cột số 10):
```bash
awk '{print $10, $7}' /var/log/nginx/access.log | sort -nr | head -n 10
```

---

## 4. Hướng Dẫn Sử Dụng Công Cụ Trực Quan GoAccess

**GoAccess** là công cụ phân tích log web mã nguồn mở theo thời gian thực (Real-time Web Log Analyzer), hỗ trợ cả giao diện dòng lệnh tương tác trực quan (Terminal TUI) và tạo báo cáo HTML dạng dashboard hiện đại.

---

### 4.1. Cài đặt GoAccess

#### Trên Ubuntu / Debian:
```bash
sudo apt update
sudo apt install -y goaccess
```

#### Trên CentOS / RHEL / AlmaLinux:
```bash
sudo yum install -y epel-release
sudo yum install -y goaccess
```

#### Trên Alpine Linux:
```bash
apk add goaccess
```

#### Trên macOS:
```bash
brew install goaccess
```

---

### 4.2. Chế độ Interactive TUI trên Terminal

Chạy GoAccess tương tác ngay trong cửa sổ dòng lệnh:
```bash
goaccess /var/log/nginx/access.log -c --log-format=COMBINED
```

#### Các phím tắt thao tác chính:
- `Tab`: Chuyển giữa các khung module (Top URLs, Visitors, Status Codes, OS, Browsers...).
- `Shift + Tab`: Quay lại khung trước đó.
- `Enter` hoặc `0 - 9`: Phóng to / mở rộng xem chi tiết của một module.
- `s`: Sắp xếp các cột trong bảng hiện tại.
- `/`: Tìm kiếm chuỗi văn bản trong log.
- `q`: Đóng bảng phóng to hoặc thoát chương trình.

---

### 4.3. Xuất báo cáo HTML trực quan (Visual Report)

Xuất toàn bộ dữ liệu log ra một file HTML duy nhất (tự động nhúng sẵn CSS, Chart.js, JS):
```bash
goaccess /var/log/nginx/access.log -o /var/www/html/report.html --log-format=COMBINED
```

> File `report.html` sau khi mở trên trình duyệt sẽ cung cấp:
> - Biểu đồ lượt truy cập theo thời gian (Unique Visitors, Hits, Bandwidth).
> - Top các URL/API được gọi nhiều nhất.
> - Thống kê chi tiết mã trạng thái HTTP (2xx, 3xx, 4xx, 5xx).
> - Bản đồ địa lý IP khách truy cập (nếu có GeoIP).
> - Danh sách trình duyệt, hệ điều hành và User-Agent.

---

### 4.4. Bảng điều khiển Real-time HTML Dashboard qua WebSocket

Để dashboard tự động cập nhật dữ liệu mỗi khi có request mới mà không cần F5 trình duyệt:

```bash
goaccess /var/log/nginx/access.log \
  -o /var/www/html/realtime_report.html \
  --log-format=COMBINED \
  --real-time-html \
  --ws-url=ws://<dia-chi-ip-may-chu>:7890
```

> [!IMPORTANT]
> - Cần mở port `7890/TCP` trên tường lửa (UFW / Security Group):
>   ```bash
>   sudo ufw allow 7890/tcp
>   ```
> - Nếu chạy qua HTTPS, sử dụng WSS (WebSocket Secure) qua cờ `--ws-url=wss://domain.com/ws`.

---

### 4.5. Cấu hình file `goaccess.conf`

Để không phải gõ `--log-format=COMBINED` mỗi lần chạy, cấu hình file `/etc/goaccess/goaccess.conf` hoặc `~/.goaccessrc`:

```conf
# Định dạng ngày giờ chuẩn NGINX
time-format %H:%M:%S
date-format %d/%b/%Y

# Định dạng NGINX Combined Log
log-format %h %^[%d:%t %^] "%r" %s %b "%R" "%u"

# Tùy chọn hiển thị
real-os true
agent-list true
with-output-resolver true
```

Sau khi cấu hình xong, chỉ cần gõ ngắn gọn:
```bash
goaccess /var/log/nginx/access.log -o /var/www/html/report.html
```

---

### 4.6. Chạy GoAccess qua Docker

Nếu không muốn cài đặt trực tiếp lên hệ điều hành host, có thể dùng Docker:

```bash
docker run --rm -it \
  -v /var/log/nginx:/var/log/nginx:ro \
  -v /var/www/html:/var/www/html \
  allinurl/goaccess \
  /var/log/nginx/access.log \
  -o /var/www/html/report.html \
  --log-format=COMBINED
```

Hoặc tích hợp vào [docker-compose.yml](file:///e:/Users/Admins/ngonNguKichBan/miniProject/docker-compose.yml):
```yaml
  goaccess:
    image: allinurl/goaccess
    container_name: goaccess_dashboard
    restart: always
    ports:
      - "7890:7890"
    volumes:
      - ./logs/nginx:/var/log/nginx:ro
      - ./public/report:/var/www/html
    command: >
      /var/log/nginx/access.log
      -o /var/www/html/index.html
      --log-format=COMBINED
      --real-time-html
      --ws-url=ws://localhost:7890
```

---

## 5. Tóm Tắt Bảng Tra Cứu Nhanh (Cheat Sheet)

| Tác Vụ | Câu Lệnh Thực Hiện |
| :--- | :--- |
| **Top 10 IP** | `awk '{print $1}' access.log \| sort \| uniq -c \| sort -nr \| head -10` |
| **Lọc ngày 28/09** | `grep "28/Sep" access.log` |
| **Lọc giờ 14:00 ngày 28/09** | `grep "28/Sep/2026:14:" access.log` |
| **Thống kê Status Code** | `awk '{print $9}' access.log \| sort \| uniq -c \| sort -nr` |
| **Tìm lỗi 500** | `awk '$9 == "500"' access.log` |
| **Top URL bị 404** | `awk '$9 == "404" {print $7}' access.log \| sort \| uniq -c \| sort -nr` |
| **Top 5 User-Agent** | `awk -F'"' '{print $6}' access.log \| sort \| uniq -c \| sort -nr \| head -5` |
| **Phát hiện bot / curl** | `grep -Ei "curl\|postman\|bot" access.log` |
| **Báo cáo GoAccess TUI** | `goaccess access.log -c --log-format=COMBINED` |
| **Xuất báo cáo HTML** | `goaccess access.log -o report.html --log-format=COMBINED` |
