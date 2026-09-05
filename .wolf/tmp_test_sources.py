"""Test each news source individually."""
import sys, concurrent.futures, time
sys.path.insert(0, '.')
import sys
sys.stdout.reconfigure(encoding='utf-8')

from news.multi_fetcher import MultiSourceNewsFetcher
f = MultiSourceNewsFetcher()

sources = [
    ("财联社 cls", lambda: f._from_cls(5)),
    ("金十 ths", lambda: f._from_jin10(5)),
    ("新浪 em", lambda: f._from_sina(5)),
]

for name, fn in sources:
    ex = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    try:
        t0 = time.time()
        rows = ex.submit(fn).result(timeout=8)
        elapsed = time.time() - t0
        print(f"{name}: {len(rows)} items in {elapsed:.1f}s")
        if rows:
            for r in rows[:2]:
                title = r.get("title", "")[:50]
                src = r.get("source", "")
                print(f"  -> {title} [{src}]")
        else:
            print(f"  -> empty")
    except concurrent.futures.TimeoutError:
        print(f"{name}: TIMEOUT >8s")
    except Exception as e:
        print(f"{name}: ERROR {e}")
    finally:
        ex.shutdown(wait=False)

# Also test the brief fetch
print("\n=== fetch(limit=20) ===")
t0 = time.time()
items = f.fetch(limit=20, timeout=8)
print(f"total: {len(items)} items in {time.time()-t0:.1f}s")
sources_seen = set()
for it in items:
    s = it.get("source","")
    sources_seen.add(s.split(", ")[0] if ", " in s else s)
print(f"sources: {sources_seen}")
