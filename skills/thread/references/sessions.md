# Syncing and splitting a chat

How `/thread sync` and `/thread split` work. `/thread branch` is the same as `/thread split`. Both use the commands in SKILL.md.

## Syncing a chat

One chat often drifts across several things. `/thread sync` makes sure each of them is in a
thread, without stopping the user to ask. It records; it does not finish work, commit or close
the chat (that is `/thread wrap`).

1. **Find the strands.** Go through the conversation since the last sync, or since the chat
   began, and list each distinct piece of work: a task, a question pursued, a decision taken.
   A strand is something someone might later want to find or pick back up, not every step.
2. **Record each one.**
   - Already in a thread: `note` what moved since that thread was last touched, in one line
     (a decision, a file, a commit, a PR). Skip it if nothing did. Use `refine` if the work
     has drifted from the title.
   - Not yet in a thread: `open` it. Under this chat's thread when it comes out of that work,
     as a root (under the chat's project, if set) when it is plainly unrelated. Add a
     `describe` when the title alone would not let someone pick it up cold.
   - Finished: `done` with a resolution. Abandoned or set aside: `drop` or `park` with why.
   - An improvement, bug or idea mentioned in passing: capture it by kind.
3. **Follow the latest.** This chat now follows the thread of the most recent strand.
4. **Rename the chat**, wherever the tool can (a session or chat title). Use the latest
   strand's title. When several strands are still in play, name the theme they share with the
   latest first, for example "Thread skill: sync and split". Keep it under about 50
   characters; don't agonise over it. A tool that can't rename chats skips this; the anchor
   line does the job.
5. **Push.** Run `sync` so every event reaches the store.

Reply with the anchor line, then one line per thread touched: id, what happened (opened,
noted, refined, closed) and title. Then the new chat name, if it changed. No table and no
closing line. If one strand has grown big enough to deserve its own session, add one line
offering to split it (`/thread split <id>`); offer once per strand.

## Splitting work into its own session

**Splitting** is the usual reason to fork: work that started inside this chat has become a
standalone thing and the user wants it in its own session. For `/thread split [what]`, `/thread
branch [what]`, or "move this to its own session":

1. Work out what is being split: what the user names, else the most recent substantial strand.
2. Give it its own thread. If it is already in a thread other than this chat's own, use that
   one. Otherwise `open` it as a child of this chat's thread (a root if it is unrelated), with
   a `describe` that stands on its own. If this chat's own thread *is* the work being split,
   use it, and this chat follows its parent afterwards.
3. `fork` that thread and write the handoff.
4. Start the new session. Where the tool can start a chat or session with a prompt (a new
   session, a background task, a suggested-task chip the user clicks), start it with the
   handoff as the prompt, in the same project or repository. Otherwise give the handoff in one
   code block to paste into a new chat.
5. Back here: `note` on this chat's thread that the work moved to the new thread, stop working
   on it in this chat, and rename the chat for what it still covers.

Reply with the new thread's anchor, where the new session is (or the handoff to paste), and
the anchor of the thread this chat follows now.
