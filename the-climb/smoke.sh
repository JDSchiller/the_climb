#!/bin/sh
set -e
cd /home/claude/climb
npx tsx scripts/seed.ts > seed_out.txt
TOKEN=$(grep -o "/e/.*" seed_out.txt | sed 's|/e/||')
nohup npx next start -p 3000 > server.log 2>&1 &
SERVER=$!
sleep 5

echo "=== 1. Jordan login flow"
CODE=$(curl -s -X POST localhost:3000/api/auth/request-code -H "Content-Type: application/json" -d '{"identifier":"jordan@example.com"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['sandboxCode'])")
curl -s -c /tmp/jordan.jar -X POST localhost:3000/api/auth/verify -H "Content-Type: application/json" -d "{\"identifier\":\"jordan@example.com\",\"code\":\"$CODE\"}"; echo ""

echo "=== 2. Jordan /manage shows (expect Kohen + Rex, NOT Finn):"
curl -s -b /tmp/jordan.jar localhost:3000/manage | grep -o "Kohen Schiller\|Rex Calloway\|Finn Osei" | sort -u

echo "=== 3. Demo parent scoping (expect ONLY Finn):"
DCODE=$(curl -s -X POST localhost:3000/api/auth/request-code -H "Content-Type: application/json" -d '{"identifier":"demo@example.com"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['sandboxCode'])")
curl -s -c /tmp/demo.jar -X POST localhost:3000/api/auth/verify -H "Content-Type: application/json" -d "{\"identifier\":\"demo@example.com\",\"code\":\"$DCODE\"}" > /dev/null
curl -s -b /tmp/demo.jar localhost:3000/manage | grep -o "Kohen Schiller\|Rex Calloway\|Finn Osei" | sort -u

echo "=== 4. Demo parent forced into Kohen's workspace (expect redirect away):"
KOHEN_ID=$(python3 -c "import sqlite3; print(sqlite3.connect('data/app.db').execute(\"SELECT id FROM athletes WHERE name='Kohen Schiller'\").fetchone()[0])")
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" -b /tmp/demo.jar "localhost:3000/manage/$KOHEN_ID/ledger"

echo "=== 5. Kohen phone login + /home content:"
KCODE=$(curl -s -X POST localhost:3000/api/auth/request-code -H "Content-Type: application/json" -d '{"identifier":"+1 (407) 555-0101"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['sandboxCode'])")
curl -s -c /tmp/kohen.jar -X POST localhost:3000/api/auth/verify -H "Content-Type: application/json" -d "{\"identifier\":\"+14075550101\",\"code\":\"$KCODE\"}" > /dev/null
curl -s -b /tmp/kohen.jar localhost:3000/home | grep -o "Next up\|Skill progress\|My ledger\|\$1,000.00\|held to savings" | sort -u

echo "=== 6. Coach link GET (expect athlete first name + rubric):"
curl -s "localhost:3000/e/$TOKEN" | grep -o "Kohen\|Skill progress check-in\|works once" | sort -u

echo "=== 7. Coach link POST (all 10 skills, stage 2s and 3s):"
python3 - "$TOKEN" << 'PYEOF'
import sqlite3, json, urllib.request, sys
token = sys.argv[1]
db = sqlite3.connect('data/app.db')
items = db.execute("SELECT ri.id FROM rubric_items ri JOIN rubrics r ON r.id=ri.rubric_id WHERE r.kind='skill_progress' ORDER BY ri.ord").fetchall()
scores = [{"rubric_item_id": i[0], "score": 3 if n in (1,7) else 2} for n, i in enumerate(items)]
body = json.dumps({"eval_date":"2026-08-12","level_context":"12U AA","notes":{"moved":"First strides pop now","focus_next":"Backward transitions, off-side stops","coach_comment":"Compete level is real."},"scores":scores}).encode()
req = urllib.request.Request(f"http://localhost:3000/api/e/{token}", data=body, headers={"Content-Type":"application/json"}, method="POST")
print(urllib.request.urlopen(req).read().decode())
PYEOF

echo "=== 8. Link reuse blocked (expect 410):"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "localhost:3000/api/e/$TOKEN" -H "Content-Type: application/json" -d '{"eval_date":"2026-08-12","level_context":"12U AA","scores":[]}'

echo "=== 9. Skill grid now shows two check-in columns (Jordan's view):"
curl -s -b /tmp/jordan.jar "localhost:3000/manage/$KOHEN_ID/skills" | grep -o "Jul 20\|Aug 12" | sort -u

echo "=== 10. Guardian post-game eval, 42/50, hustle bonus -> ledger:"
python3 - << 'PYEOF'
import sqlite3, json, urllib.request
db = sqlite3.connect('data/app.db')
kohen = db.execute("SELECT id FROM athletes WHERE name='Kohen Schiller'").fetchone()[0]
rubric = db.execute("SELECT id FROM rubrics WHERE kind='post_game'").fetchone()[0]
items = db.execute("SELECT id FROM rubric_items WHERE rubric_id=? ORDER BY ord", (rubric,)).fetchall()
scores = [{"rubric_item_id": i[0], "score": 5 if n < 2 else 4} for n, i in enumerate(items)]
cookie = [l.split('\t')[-1].strip() for l in open('/tmp/jordan.jar') if 'climb_session' in l][0]
opener = urllib.request.build_opener()
opener.addheaders = [('Cookie', f'climb_session={cookie}')]
body = json.dumps({"athlete_id": kohen, "rubric_id": rubric, "eval_date":"2026-08-29","level_context":"12U AA","notes":{"great":"Saw the goal before the pass on the 2nd assist.","work_on":"Shift length","his_answer":"Get off the ice 10 seconds earlier"},"scores":scores,"post_hustle_bonus":True}).encode()
req = urllib.request.Request("http://localhost:3000/api/evaluations", data=body, headers={"Content-Type":"application/json"}, method="POST")
print(opener.open(req).read().decode())
bal = db.execute("SELECT SUM(amount) FROM ledger_entries le JOIN ledgers l ON l.id=le.ledger_id WHERE l.athlete_id=?", (kohen,)).fetchone()[0]
print(f"ledger balance after bonus (expect 105000 = $1,050.00): {bal}")
PYEOF

echo "=== 11. Audit log actions recorded:"
python3 -c "import sqlite3; [print(r[0], r[1]) for r in sqlite3.connect('data/app.db').execute('SELECT action, COUNT(*) FROM audit_log GROUP BY action')]"

echo "=== 12. Unauthenticated media fetch blocked (expect 401):"
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/media/anything

kill $SERVER 2>/dev/null
echo "=== DONE"
