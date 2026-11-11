#!/bin/sh
LOG_FILE="/var/log/nginx/access.log"

echo "=================================================================="
echo "1. XAC DINH FILE LOG MAC DINH & CAU HINH LOG_FORMAT"
echo "=================================================================="
ls -lh "$LOG_FILE"
echo "--- Cau hinh log_format trong /etc/nginx/nginx.conf ---"
grep -A 3 "log_format" /etc/nginx/nginx.conf

echo ""
echo "=================================================================="
echo "2. MAU DONG LOG THUC TE TRONG /var/log/nginx/access.log"
echo "=================================================================="
head -n 3 "$LOG_FILE"

echo ""
echo "=================================================================="
echo "3. CO BAN: AI TRUY CAP, KHI NAO, TU IP NAO"
echo "=================================================================="
echo "--- Top IP truy cap nhieu nhat ---"
awk '{print $1}' "$LOG_FILE" | sort | uniq -c | sort -nr

echo "--- Chi tiet (IP | Thoi gian | Phuong thuc + URL | Status) ---"
awk '{print "IP:", $1, "| Time:", $4, "| Req:", $6, $7, "| Status:", $9}' "$LOG_FILE" | head -n 5

echo ""
echo "=================================================================="
echo "4. LOC THEO NGAY / GIO"
echo "=================================================================="
TODAY=$(date +"%d/%b/%Y")
echo "--- Thong ke luong truy cap theo tung gio hom nay ($TODAY) ---"
grep "$TODAY" "$LOG_FILE" | awk '{print $4}' | cut -d: -f2 | sort | uniq -c

echo "--- Trich xuat bang sed (VD: 3 dong dau tien) ---"
sed -n '1,3p' "$LOG_FILE"

echo ""
echo "=================================================================="
echo "5. LOC THEO STATUS CODE (200, 401, 403, 404, 500)"
echo "=================================================================="
echo "--- Phan bo Status Code ---"
awk '{print $9}' "$LOG_FILE" | sort | uniq -c | sort -nr

echo "--- Cac request bi chan quyen RBAC (401 / 403) ---"
awk '$9 == 401 || $9 == 403 {print $1, $4, $6, $7, "-> Status:", $9}' "$LOG_FILE"

echo "--- Cac URL bi loi 404 Not Found (Dau hieu scan lo hong) ---"
awk '$9 == 404 {print $1, $7, "-> Status:", $9}' "$LOG_FILE"

echo ""
echo "=================================================================="
echo "6. LOC THEO USER-AGENT (TRINH DUYET, BOT, CONG CU)"
echo "=================================================================="
echo "--- Top User-Agent ---"
awk -F'"' '{print $6}' "$LOG_FILE" | sort | uniq -c | sort -nr

echo "--- Phat hien Bot / Crawler / CLI Tools (curl, python, postman, bot) ---"
grep -Ei "curl|python|postman|bot" "$LOG_FILE" | awk -F'"' '{print $2, "| UA:", $6}'
