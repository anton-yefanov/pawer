#!/usr/bin/env python3
"""next.py STAGE_DIR TAB_ID FILE_REF -> prints the browser_batch actions for the next pending post
   next.py --done N                  -> marks post N scheduled"""
import json, os, shutil, sys

UPLOAD = 'https://www.tiktok.com/tiktokstudio/upload?from=creator_center&tab=photo'
HERE = os.path.dirname(os.path.abspath(__file__))
SCHEDULE = os.path.join(HERE, 'schedule.json')
POSTS = os.path.expanduser('~/Desktop/tiktok')

posts = json.load(open(SCHEDULE))

if sys.argv[1] == '--done':
    n = int(sys.argv[2])
    next(p for p in posts if p['post'] == n)['done'] = True
    json.dump(posts, open(SCHEDULE, 'w'), ensure_ascii=False, indent=1)
    left = [p['post'] for p in posts if not p['done'] and p['when']]
    print(f'post {n} done; {len(left)} left')
    sys.exit()

stage, tab, ref = sys.argv[1], int(sys.argv[2]), sys.argv[3]
p = next((p for p in posts if not p['done'] and p['when']), None)
if not p:
    print('nothing left to schedule'); sys.exit()

# The Chrome upload tool can only read session-readable paths, not ~/Desktop.
dst = os.path.join(stage, str(p['post']))
shutil.rmtree(dst, ignore_errors=True)
shutil.copytree(os.path.join(POSTS, str(p['post'])), dst)
paths = [os.path.join(dst, f'{i}.jpg') for i in range(1, 8)]

date, time = p['when'].split()
_, month, day = map(int, date.split('-'))
offset = '+02:00' if (month, day) < (10, 25) else '+01:00'  # Madrid summer time ends Oct 25
q = lambda s: json.dumps(s, ensure_ascii=False)
title, desc = p['title'], p['desc'] + ' ' + ' '.join(p['tags'])
song_query, song = p['song']

# Nothing here uses the keyboard: key events never reach the page while the Chrome window is
# unfocused (only the emoji arrived, which is what the "🔥🔥" titles were). Text is set through
# the native value setter + input event, and the Draft.js description through a paste event —
# execCommand('insertText'/'selectAll') crashes that editor.
SET_TEXT = (
    "const setV=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;"
    f"const t=document.querySelector('input[placeholder]');setV.call(t,{q(title)});"
    "t.dispatchEvent(new Event('input',{bubbles:true}));"
    "const e=document.querySelector('[contenteditable=true]');e.focus();"
    f"const dt=new DataTransfer();dt.setData('text/plain',{q(desc)});"
    "e.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:dt}));"
)

def js(code): return {'name': 'javascript_tool', 'input': {'action': 'javascript_exec', 'tabId': tab, 'text': code}}
def c(**kw): return {'name': 'computer', 'input': {**kw, 'tabId': tab}}
def wait(s=1): return c(action='wait', duration=s)

actions = [
    {'name': 'file_upload', 'input': {'tabId': tab, 'ref': ref, 'paths': paths}},
    # The form re-renders when the photos finish uploading, wiping anything set before that;
    # only the Publish button shows it (aria-disabled until done).
    wait(7),
    js("const n=document.querySelectorAll('button[aria-label=\"Delete photo\"]').length;"
       "const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Опублікувати');"
       "if(n<7||b?.getAttribute('aria-disabled')!=='false')throw new Error('upload not finished: '+n);"
       + SET_TEXT + "'text set'"),
    wait(),
    js(f"const t=document.querySelector('input[placeholder]').value,d=document.querySelector('[contenteditable=true]').textContent;"
       f"if(t!=={q(title)}||!d.includes({q(p['tags'][-1])}))throw new Error('text lost: '+t);'text ok'"),
    js("[...document.querySelectorAll('button')].find(b=>b.innerText.includes('Додати аудіозапис')).click();'audio'"),
    wait(2),
    js("const s=document.querySelector('input[placeholder=\"Шукати аудіозаписи\"]');"
       "const setV=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;"
       f"setV.call(s,{q(song_query)});s.dispatchEvent(new Event('input',{{bubbles:true}}));"
       "s.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:13,which:13,bubbles:true}));'searching'"),
    wait(4),
    # The dialog opens on a "For you" list and swaps in results later: only take an exact match.
    js("const u=[...document.querySelectorAll('button')].filter(b=>b.innerText.trim()==='Use');"
       "let r=u[0];while(r&&!r.innerText.includes('·'))r=r.parentElement;"
       f"const t=r?.innerText.trim().split('\\n')[0];if(t!=={q(song)})throw new Error('first result is '+t);u[0].click();t"),
    wait(2),
    # One call switches "Now"->"Later" and sets date+time: the scheduler component's value is
    # {time: unix seconds, isSwitchOn}. The pickers themselves only work in a visible tab.
    js("document.activeElement?.blur();document.body.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));document.body.click();"
       "const r=[...document.querySelectorAll('input[type=radio]')][1];"
       "let f=r[Object.keys(r).find(k=>k.startsWith('__reactFiber'))];"
       "while(f&&!(f.memoizedProps?.value&&typeof f.memoizedProps.value==='object'&&'isSwitchOn' in f.memoizedProps.value&&typeof f.memoizedProps.onChange==='function'))f=f.return;"
       "if(!f)throw new Error('scheduler component not found');"
       f"f.memoizedProps.onChange({{time:Math.floor(new Date('{date}T{time}:00{offset}').getTime()/1000),isSwitchOn:true}});'set'"),
    wait(),
    js("const vals=[...document.querySelectorAll('input')].map(i=>i.value);const main=document.querySelector('main').textContent;"
       "const got={date:vals.find(v=>/^\\d{4}-\\d\\d-\\d\\d$/.test(v)),time:vals.find(v=>/^\\d\\d:\\d\\d$/.test(v)),"
       "title:document.querySelector('input[placeholder]').value,desc:document.querySelector('[contenteditable=true]').textContent,"
       f"song:main.includes({q(song)}),tooSoon:main.includes('Заплануй принаймні')}};"
       f"const ok=got.date==={q(date)}&&got.time==={q(time)}&&got.title==={q(title)}&&got.desc.includes({q(p['tags'][-1])})&&got.song&&!got.tooSoon;"
       "if(ok)[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Запланувати').click();"
       "JSON.stringify({ok,...got,desc:got.desc.slice(0,30)})"),
    wait(3),
    # First schedule on an account shows a consent dialog that swallows the click; allow and re-click.
    js("const a=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Дозволити');if(a){a.click();'allowed'}else 'no dialog'"),
    wait(2),
    js("if(location.pathname.endsWith('/content'))'already scheduled';"
       "else{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Запланувати');if(b){b.click();'re-clicked'}else 'no button'}"),
    wait(5),
    js("'scheduled: '+location.pathname.endsWith('/content')"),
    # Leave the next upload page open and report its file-input ref for the next iteration.
    {'name': 'navigate', 'input': {'url': UPLOAD, 'tabId': tab, 'force': True}},
    wait(3),
    {'name': 'find', 'input': {'tabId': tab, 'query': 'file input for photo upload'}},
]
print(f"# post {p['post']} @ {p['when']} Madrid | {song} | {title}")
print(json.dumps(actions, ensure_ascii=False))
