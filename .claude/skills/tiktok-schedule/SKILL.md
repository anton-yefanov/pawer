---
name: tiktok-schedule
description: Schedule the Pawer TikTok photo carousels (~/Desktop/tiktok/<n>/1-7.jpg) in TikTok Studio through Claude in Chrome — photos, title, description, tags, phonk song, date and time. Use when asked to schedule, queue, or post the next TikTok carousels.
---

# Scheduling TikTok carousels

`schedule.json` is the queue: one entry per carousel with its slot (`when`, Europe/Madrid
local time, which is what TikTok Studio shows), title, description, tags, song and `done`.
Slots are 8:00 / 12:30 / 19:00 ET, i.e. 14:00 / 18:30 / 01:00(+1) Madrid while both zones
are on summer time. Entries with `when: null` didn't fit TikTok's 30-day scheduling window —
give them slots when the window opens (keep 3/day, same times; Madrid leaves summer time on
Oct 25 and the US on Nov 1, so that week the offset is 5h, not 6h).

The user approved scheduling this whole queue publicly; the commercial-content and AI labels stay off
(their decision). Don't change either without asking.

## Loop, one post per iteration

1. In one `browser_batch`, navigate to
   `https://www.tiktok.com/tiktokstudio/upload?from=creator_center&tab=photo` (with `force: true`,
   which drops a half-filled draft left by a failed run), wait 3s, and
   `find` "file input for photo upload". Its ref changes on every load, so it can't be baked in.
2. `python3 .claude/skills/tiktok-schedule/next.py <scratchpad>/upload <tabId> <ref>`: copies
   the next post into the scratchpad (the Chrome upload tool can't read ~/Desktop) and prints
   a `browser_batch` actions array.
3. Pass that array to `mcp__claude-in-chrome__browser_batch` as-is. On success the verify
   step returns `{"ok":true,...}` and the one after it `scheduled: true`. A step that
   throws stops the batch before Schedule is clicked, so nothing half-done gets posted. The batch then opens a fresh upload
   page and `find`s its file input, so the next iteration can skip step 1 and use that ref.
4. `python3 .claude/skills/tiktok-schedule/next.py --done <n>`, then go back to step 2.

The UI is TikTok Studio in Ukrainian. Take a screenshot only when a step fails.

## Why it's scripted the way it is

- **Background tab:** Chrome throttles timers in a hidden tab to as little as once a minute,
  so any `await sleep()` inside page JS can blow through the 45s `javascript_exec` limit.
  A timed-out script keeps running and can still click Schedule later. So every JS step is
  synchronous, and all waiting is done with the batch's `wait` actions.
- **Date and time (the "timer issue"):** don't touch the pickers. The hour/minute options
  only respond in a rendered, visible tab, so they silently do nothing whenever the Chrome
  window is behind another window. Two more traps: the hashtag dropdown swallows their
  clicks, and the calendar leads with last month's days. Instead, walk up the React fiber
  from the time input to the scheduler component, whose `value` is
  `{time: <unix seconds>, isSwitchOn}`, and call its `onChange` with the wanted epoch. This
  sets date and time at once and works in the background. The slot is converted from
  Madrid time (UTC+2, or UTC+1 from Oct 25).
- **Text:** the title input and the description editor (Draft.js) need real keystrokes, so
  JS only focuses them and the `type` action does the typing. Coordinates aren't used,
  because the window's screenshot frame keeps changing size.
- **Stale form:** the form re-renders once the photos have finished uploading to TikTok,
  and anything typed before then is lost (usually all but the last emoji). Only the
  Publish button shows it (`aria-disabled="true"` until done). The readiness step throws
  if the upload isn't finished, and a check after typing throws if a late re-render wiped
  the text. Either way, rerun the batch from the readiness step: typing is preceded by
  cmd+a, so leftovers get replaced, not appended.
- **Song:** the dialog opens on a "For you" list and swaps in search results later, so only
  an exact first-result title match is used. (Post 11 went out with a random "For you" track
  before this check existed.)
- **Verify before scheduling:** Schedule is only clicked if date, time, title, tags and the
  exact song all read back correctly and the "at least 15 minutes ahead" error isn't
  showing. After any failure, check the content list before retrying, so you don't
  schedule a post twice.
- **Can't edit:** TikTok doesn't allow editing scheduled posts, so a mistake means deleting
  and rescheduling, and that needs the user's OK.
