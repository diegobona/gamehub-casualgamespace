#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将本地 CSV(游戏信息表.csv) 的游戏数据导入并追加到 assets/JSON/games.json
- 仅用标准库(csv/json/argparse/pathlib/sys/os)
- UTF-8/UTF-8 BOM 兼容
- 按 name 去重（忽略大小写+空白），避免重复导入
- id 递增分配；use 固定为 "iframe"
- 追加写入并保持 JSON 可读性（缩进）
"""

import csv
import json
import sys
import argparse
from pathlib import Path

REQUIRED_FIELDS = ["name", "category", "thumbnail", "url", "description", "instructions"]
def clean_cell_value(val: str) -> str:
    """清洗单元格文本：去首尾空白、去掉成对包裹引号，以及 Excel 导出可能产生的前置引号。
    支持成对引号："...", '...', “...”, ‘...’
    同时尽量处理只有前置引号的情况。
    """
    if val is None:
        return ""
    s = str(val).strip()
    if s == "":
        return ""

    pairs = [("\"", "\""), ("'", "'"), ('“', '”'), ('‘', '’')]
    for a, b in pairs:
        if s.startswith(a) and s.endswith(b) and len(s) >= 2:
            s = s[1:-1].strip()
            break

    # Excel 为避免公式/科学计数法，可能导出以引号开头的文本（只在前面有引号）
    if s.startswith("'") and not s.endswith("'"):
        s = s[1:].lstrip()
    if s.startswith('"') and not s.endswith('"'):
        s = s[1:].lstrip()

    return s


def norm_name(s: str) -> str:
    s = clean_cell_value(s)
    if s is None:
        return ""
    # 忽略大小写、去掉首尾空白、压缩中间空白
    return " ".join(s.strip().split()).lower()

def load_existing_games(json_path: Path):
    if not json_path.exists():
        print(f"[info] 目标 JSON 不存在，将创建新文件：{json_path}")
        return [], set(), 0

    try:
        with json_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"[error] 解析 JSON 失败：{json_path}\n{e}")
        sys.exit(1)

    if not isinstance(data, list):
        print(f"[error] JSON 根元素必须是数组：{json_path}")
        sys.exit(1)

    existing = data
    existing_names = set()
    max_id = 0
    for item in existing:
        if isinstance(item, dict):
            nm = norm_name(item.get("name", ""))
            if nm:
                existing_names.add(nm)
            try:
                iid = int(item.get("id", 0))
                if iid > max_id:
                    max_id = iid
            except (TypeError, ValueError):
                pass
    return existing, existing_names, max_id

def normalize_row_keys(row: dict) -> dict:
    # 将表头统一为小写去空白，值保留原始
    return { (k.strip().lower() if isinstance(k, str) else k): v for k, v in row.items() }

def validate_headers(fieldnames):
    if not fieldnames:
        return False, "CSV 文件没有表头"
    normalized = [ (f.strip().lower() if isinstance(f, str) else f) for f in fieldnames ]
    missing = [c for c in REQUIRED_FIELDS if c not in normalized]
    if missing:
        return False, f"缺少必需列：{', '.join(missing)}"
    return True, None

def read_csv_rows(csv_path: Path, preferred_encoding: str | None = None):
    # 逐个编码尝试读取，兼容常见中文 Windows 编码
    encodings = []
    if preferred_encoding:
        encodings.append(preferred_encoding)
    encodings += ["utf-8-sig", "utf-8", "gb18030", "cp936", "gbk"]

    last_error = None
    tried = []
    for enc in [e for e in encodings if e]:
        try:
            with csv_path.open("r", encoding=enc, newline="") as f:
                reader = csv.DictReader(f)
                # 触发首行解码
                _ = reader.fieldnames
                ok, err = validate_headers(reader.fieldnames)
                if not ok:
                    print(f"[error] {err}\n当前表头：{reader.fieldnames}")
                    sys.exit(1)
                print(f"[info] 使用编码读取 CSV：{enc}")
                for idx, row in enumerate(reader, start=2):  # 从第2行（数据）开始计数
                    yield idx, normalize_row_keys(row)
                return
        except FileNotFoundError:
            print(f"[error] 找不到 CSV 文件：{csv_path}")
            sys.exit(1)
        except UnicodeDecodeError as e:
            last_error = e
            tried.append(enc)
            continue
        except OSError as e:
            print(f"[error] 打开 CSV 失败：{csv_path}\n{e}")
            sys.exit(1)

    print(f"[error] 无法用以下编码解码 CSV：{', '.join(tried)}")
    if last_error:
        print(last_error)
    print("[hint] 可尝试使用 --encoding 指定编码，例如：--encoding gb18030 或 --encoding cp936")
    sys.exit(1)

def build_game_obj(next_id: int, row: dict) -> dict:
    return {
        "id": next_id,
        "name": clean_cell_value(row.get("name", "")),
        "category": clean_cell_value(row.get("category", "")),
        "thumbnail": clean_cell_value(row.get("thumbnail", "")),
        "url": clean_cell_value(row.get("url", "")),
        "description": clean_cell_value(row.get("description", "")),
        "instructions": clean_cell_value(row.get("instructions", "")),
        "use": "iframe",
    }

def main():
    parser = argparse.ArgumentParser(description="将 CSV(游戏信息表.csv) 导入到 assets/JSON/games.json")
    parser.add_argument("--csv", default="游戏信息表.csv", help="CSV 文件路径（默认：游戏信息表.csv）")
    parser.add_argument("--json", default=str(Path("assets/JSON/games.json")), help="目标 JSON 路径（默认：assets/JSON/games.json）")
    parser.add_argument("--encoding", default=None, help="CSV 文件编码（默认自动检测/回退；可选：utf-8, gb18030, cp936 等）")
    parser.add_argument("--start-id", type=int, default=None, help="新插入数据的起始 id（必须大于当前最大 id）。不指定则为现有最大 id + 1")
    args = parser.parse_args()

    csv_path = Path(args.csv).resolve()
    json_path = Path(args.json).resolve()
    json_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"[start] 读取 CSV：{csv_path}")
    existing, existing_names, max_id = load_existing_games(json_path)
    print(f"[info] 现有游戏数量：{len(existing)}，当前最大 id：{max_id}")

    # 决定新增记录的起始 ID
    if args.start_id is not None:
        if args.start_id <= max_id:
            print(f"[error] 指定的 --start-id({args.start_id}) 必须大于当前最大 id({max_id})。")
            sys.exit(1)
        next_id = args.start_id
    else:
        next_id = max_id + 1
    print(f"[info] 新增数据起始 id：{next_id}")

    added = 0
    skipped_dup = 0
    skipped_invalid = 0
    seen_in_csv = set()

    # 逐行读取 CSV
    for line_no, row in read_csv_rows(csv_path, preferred_encoding=args.encoding):
        # 取出字段并检测必填（此处至少 name、url 需有效；其余允许为空）
        nm_raw = row.get("name", "")
        nm = norm_name(nm_raw)
        if not nm:
            print(f"[warn] 第 {line_no} 行 name 为空，跳过")
            skipped_invalid += 1
            continue

        # 去重：与已存在 JSON 或 CSV 内部重复
        if nm in existing_names or nm in seen_in_csv:
            print(f"[skip] 第 {line_no} 行 重复游戏（按 name 去重）：{nm_raw}")
            skipped_dup += 1
            continue

        # 构造对象并追加
        game = build_game_obj(next_id, row)
        existing.append(game)
        seen_in_csv.add(nm)
        added += 1
        print(f"[add] id={game['id']}  name={game['name']}")
        next_id += 1

    # 写回 JSON
    try:
        with json_path.open("w", encoding="utf-8") as wf:
            json.dump(existing, wf, ensure_ascii=False, indent=2)
        print(f"[done] 已更新：{json_path}")
    except OSError as e:
        print(f"[error] 写入 JSON 失败：{json_path}\n{e}")
        sys.exit(1)

    # 结果统计
    print("\n=== 导入结果 ===")
    print(f"新增：{added}")
    print(f"跳过（重复）：{skipped_dup}")
    print(f"跳过（无效）：{skipped_invalid}")
    print(f"最终总数：{len(existing)}")

if __name__ == "__main__":
    main()