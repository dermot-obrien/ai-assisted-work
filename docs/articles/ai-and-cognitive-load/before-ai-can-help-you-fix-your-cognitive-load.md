# Before AI can help you, fix your cognitive load

*AI will amplify the firehose of work. But you can build a better funnel. This article is mainly for enterprise architects and IT professionals but the concepts apply equally to any knowledge work. We talk about the science of why you feel overwhelmed, the surprisingly simple fix, and how to prepare for a future where AI agents do a significant chunk of your work, but only if you've built the scaffolding first.*

You know the feeling. You're an enterprise architect. You have 47 open tabs, 12 "urgent" emails, three architecture reviews due this week, a strategy document that's been "nearly done" for a month, and your manager just messaged about a new initiative that needs an architecture positioning paper by Friday.

You're not lazy. You're not disorganised. You're just drowning in open loops.

And here's the uncomfortable truth: it's about to get worse with AI. The volume of information, decisions, and documentation demands on architects is accelerating. AI is simultaneously the cause (more tools, more possibilities) and the cure, if you know how to wield it that is.

I'm an enterprise architect with over 40 years in the IT industry and over 30 years' experience with AI and machine learning, since researching neural networks at PhD level in the early 1990s. I use multiple AI agents to do work for me every day.

## Preparing for the AI-augmented future

If you're an enterprise architect today, here's my honest assessment of where things are heading:

**Within 1-2 years**, AI agents will routinely produce first drafts of reference architectures, capability models, gap analyses, and technology evaluations. The architect who can effectively direct and review AI output will be 3-5x more productive than one who does everything manually.

**Within 3-5 years**, AI agents will handle significant portions of solution design work, such as pattern selection, building block composition, integration design. The architect's role will shift further toward governance, stakeholder alignment, and the genuinely creative decisions that require organisational context and judgment.

**The architects who thrive** will be those who have built the scaffolding: structured methodologies, clear work decomposition, governance frameworks, and the discipline to limit their own work-in-progress (WIP) so they can think clearly about the things that matter.

**The architects who struggle** will be those who try to use AI as a faster way to do the same chaotic, overcommitted, context-switching work they do today. AI amplifies your working pattern. If your pattern is scattered, AI gives you scattered output faster. They will drown in detail. Make sure that's not you.

## Your brain has a hard limit (and you're likely exceeding it)

Let's start with what cognitive science actually tells us before turning to how AI changes the picture and what you can do about it.

George Miller's famous 1956 paper suggested we can hold "seven plus or minus two" items in working memory. This number has been cited in countless presentations and design guidelines. It's also wrong according to more recent research, or at least, misleading.

Nelson Cowan's more rigorous research, published in 2001 and refined through the 2010s, showed that the real capacity of working memory is approximately three to five meaningful items.[^1] That's the number of things you can actively work with mentally at once. Not remember, not recognise, but what you can actively juggle.

Now think about your typical work day. How many concurrent things or threads are you managing? Architecture reviews, vendor evaluations, strategy documents, team mentoring, stakeholder management, that proof of concept someone started and never finished and so on.

Each one of those is an open loop. And open loops have a cost.

### The Zeigarnik effect: Your brain won't shut up about unfinished work

In 1927, psychologist Bluma Zeigarnik demonstrated that unfinished tasks are remembered approximately 90% better than completed ones. Your brain creates active mental representations for incomplete work, i.e. background processes that periodically intrude on whatever you're actually trying to focus on.[^2]

Every enterprise or solution architecture initiative that is "in progress" is consuming a slice of your cognitive bandwidth, whether you're actively working on it or not. That strategy document you haven't touched in three weeks? Your brain is still tracking it. The review you promised but haven't scheduled? It's there, generating low-grade anxiety.

Research by Masicampo and Baumeister (2011) found that maintaining four or more concurrent unfinished commitments significantly increases cognitive load while reducing available willpower for subsequent decision-making.[^3] This is critical for enterprise architects, whose primary job is making and facilitating decisions. If your cognitive capacity is consumed by tracking open loops, the quality of your actual architectural thinking degrades.

### Attention residue: why "multitasking" is a lie

Sophie Leroy's 2009 research on attention residue showed that when you switch between tasks, cognitive remnants of the previous task persist and impair performance on the new one.[^4] You don't cleanly "context-switch". Fragments of the previous problem, i.e. its constraints, its stakeholders, its unresolved tensions, linger and contaminate your thinking about the current problem.

For enterprise architects, this is problematic. Enterprise architecture work requires holding complex mental models, such as technology landscapes, capability maps, integration patterns, organisational constraints. Every time you switch contexts between initiatives, you're not just losing time. You're losing the fidelity of the mental model you'd built up.

## The first fix: build a system your brain trusts

Here's the part most productivity advice gets backwards. They tell you to limit your work in progress. But if you try to cap your active initiatives at three without first having somewhere trusted to hold the other twenty, your brain won't let go. The Zeigarnik effect keeps running. The open loops stay open, just out of sight, generating the same low-grade anxiety as before. You haven't reduced cognitive load. You've just added guilt about the things you're now ignoring.

Remember Masicampo and Baumeister's research[^3]? It showed something remarkable: it's not *completing* a task that eliminates its cognitive burden. It's *making a concrete plan for it*. Simply writing "I will do X on Tuesday at 2pm" was enough to quiet the brain's background tracking. The task didn't need to be done. It needed to be *trusted to a system*.

This is the core principle behind what Tiago Forte calls a "Second Brain"[^9] which is the practice of using external systems (documents, notes, structured repositories) as a trusted extension of your own cognition. The idea isn't new; it traces back to Vannevar Bush's Memex concept in 1945 and Luhmann's Zettelkasten system. But the principle is the same: your brain is for *having* ideas, not for *holding* them. When you trust an external system to hold your commitments, your working memory is freed for the thing it's actually good at: thinking.

The next evolution is already emerging, which is an AI-powered second brain where agents don't just store your knowledge but actively retrieve, synthesise, and act on it. Daniel Miessler's Personal AI Infrastructure framework[^10] provides a comprehensive open-source architecture, and Nate B. Jones has produced an accessible guide to building one with everyday tools[^11]. But that's a topic for a another article.

So before you limit anything, build a capture system your brain actually trusts. A backlog that's reviewed regularly. A visible queue that you and your stakeholders can see. If items go into a backlog and disappear, your brain learns not to trust it, and the cognitive load returns. The system has to be real, reviewed, and reliable and not a graveyard for good intentions.

For now, we'll assume you have one without going into the detail, whether that's a structured document repository, a personal wiki, a Kanban board, a task management tool or something else entirely. The important thing is that it exists, you use it, and you trust it.

Once you have that foundation, you can safely do the next thing.

## Now limit your work in progress

The productivity world has converged on a remarkably consistent set of recommendations, from completely independent directions.

**Oliver Burkeman**, in *Four Thousand Weeks* (2021), advocates a "fixed volume" approach: maintain a closed list of no more than ten items. Nothing new goes on until something comes off, either completed or deliberately removed.[^5]

**Cal Newport**, in *Slow Productivity* (2024), argues for limiting active projects to three at most. His reasoning centres on the "overhead tax". Each active project generates ongoing administrative burden (emails, meetings, status updates, mental tracking) that consumes time disproportionate to the project's actual work. With ten active projects, most of your day is meeting and overhead. With three, most of your day is real work.[^6]

**Jim Benson's** Personal Kanban recommends starting with a Work In Progress (WIP) limit of three, explicitly noting that this should flex with energy and context.[^7]

**Leo Babauta's** Zen to Done system advocates three Most Important Tasks (MITs) per day. Do those first, and the day is a success regardless of what else happens.[^8]

The numbers vary, but the principle is consistent: deliberately constraining your active commitments is not a limitation. It is a force multiplier. You finish things faster, think more clearly, and, counterintuitively, get more done — provided everything else is safely held in that trusted system we talked about earlier.

## A practical WIP system for architects

Theory is fine. What actually works when you're tired, overcommitted, and your inbox is on fire?

Here's what the research and practical experience converge on:

### The Daily List: 5 Items, hard cap

Why not three? Three is the right number for things you're actively working on at once. But a daily list also needs to hold one or two items sequenced for later, things you'll get to after finishing something. Five gives you a "doing" zone (1-2 items) and a "ready next" zone, without exceeding the point where your brain starts losing track.

On your worst, lowest-energy day, a list of five still *looks* manageable. You glance at it and don't feel dread. A list of fifteen does the opposite.

The rule: nothing new goes on until something comes off. Completed or deliberately removed onto a backlog list. No exceptions.

### The Weekly Pool: 15 Items

This is roughly five tasks across three productive days, with allowance for the reality that some days are consumed by meetings. The weekly list is where you pull daily items from. Same one-out-before-one-in rule applies.

### Active Initiatives: 3 + everything else

This is the one that matters most for architects. How many architecture initiatives such as strategy documents, reference architectures, vendor evaluations, proofs of concept etc. are you actively progressing? If the answer is more than three, you're paying Newport's overhead tax and getting diminishing returns on all of them.

The discipline is simple: divide your work into named initiatives or whatever you want to call your projects or outcomes. Don't overthink it. Don't be tempted to create that perfect taxonomy of work. You can adapt and adjust later. Then choose three that you're intentionally and actively driving toward an outcome, plus a pseudo initiative to cover "everything else". Everything else is real work e.g. your manager asks you to review something, a stakeholder needs a quick assessment, there's a team meeting, someone pings you about a production issue. It never stops. But by separating it from your three focus initiatives, every task you pick up forces a conscious question: "Is this progressing one of my three outcomes, or is it reactive?"

This isn't about refusing reactive work. Your manager or key stakeholder asks, you do it. But you're aware of the trade-off. You're choosing with intention rather than drifting through the day responding to whoever made the most noise.

Work items in planning or scoping don't count against the three as they are preparation, not execution. Items that are blocked or awaiting someone else still count. You should still be scheduling follow-ups, sending nudges, and keeping them moving. A blocked initiative that you stop chasing is an initiative that stays blocked. But anything you're actively executing on? Three, plus the ongoing stream of ad hoc work.

**The real power: make your three visible.**

Publish a simple page such as a wiki, a shared document, a Confluence page, whatever your organisation uses, that lists:
1. Your three active initiatives with a one-line description of the outcome you're driving toward and perhaps who it is for.
2. Your backlog: everything else you've been asked to do but aren't actively progressing.

That's it. No tasks, no activities, no detail. Just the initiative-level or outcome-level view i.e. things that typically take a few weeks to a couple of months.

That page becomes your most powerful stakeholder management tool. When a new request arrives, you point people to the page: "Here's what I'm currently working on. If this new thing is more important, what should I pause?" You're not saying no. You're asking your stakeholders to make the priority call. And if two stakeholders disagree, they can resolve it between themselves or escalate to your manager. That's their job, not yours.

Review this page regularly with your manager and / or key stakeholders but fortnightly works well. Keep alignment. Make sure what you're working on is still the right thing. When an initiative completes, promote the next one from the backlog together.

The side effect is trust. When people can see what you're doing and why, they stop assuming you're ignoring their request. They can see it's queued. They understand the trade-offs. And you stop carrying the cognitive load of managing everyone's expectations in your head.

### Monthly focus: 1-2 strategic themes

At the monthly level, don't limit tasks or even initiatives. Limit "domains of attention". Your three active initiatives should cluster under one or two broader themes. "Does this serve one of my focus areas this month?" is a powerful filter for the constant stream of requests that hit an enterprise architect's inbox or chat.

| Scope | Limit | Rule |
|-------|-------|------|
| Right now | 1 | One thing at a time. |
| Today | 5 tasks | One out before one in. |
| This week | 15 tasks | Pool to pull daily tasks from. |
| Active initiatives | 3 + everything else | Make the three visible. New work requires a trade-off. |
| Monthly focus | 1-2 themes | Strategic filter for incoming work. |

### The low-energy test

Any system you adopt must pass the low-energy test: can you operate it when you're tired, sick, or demoralised?

- The daily list should be short enough to hold in your head (five works; ten doesn't).
- The rule should be dead simple: "one out before one in".
- You should never have to make a complex categorisation decision when depleted.
- Two decision points: weekly review (Sunday/Monday) and daily task selection (morning or night before).

That's it. Don't build a cascading multi-tier system with limits at every level. Two tiers, i.e. the weekly pool and daily active, with a loose monthly focus is the sweet spot between structure and sustainability.

## Now here's where AI changes everything

If you've read this far, you might be thinking: "This is just personal productivity advice. What does this have to do with AI?"

Everything. Because AI agents are about to become your colleagues and assistants, and they need the same kind of structure, arguably more.

### The problem AI creates

AI tools are incredible accelerators. I use Github Copilot, Claude Code and Cursor interchangeably my personal research and professional work for AI research, architecture, research synthesis, code generation, and analysis. But they also create a new failure mode: you can start things faster than ever, which means you can have more things in progress than ever and more things to track.

The cognitive load doesn't decrease just because an AI drafted your document. You still need to review it, integrate it with other work, make the decisions it can't make, and maintain context across all your initiatives. In fact, the ease of starting things with AI can *increase* your WIP if you're not disciplined.

### The opportunity AI creates

Here's the flip side. With proper work management, AI agents don't just help you *do* work, they help you close loops faster, which directly reduces cognitive load.

An architecture research task that would take you two days of reading and synthesis? An AI agent can produce a structured research report in 30 minutes. A gap analysis across a technology landscape? Hours, not weeks. Documentation that's been languishing because you haven't had time to write it? Draft to review-ready in a single session.

The key insight: AI agents are WIP reduction machines, but only if you have a coherent plan for them to execute against.

### Why AI agents need structure more than you do

Here's what I've learned from building and using AI agent workflows: an AI agent with a vague brief produces vague output. An AI agent with a structured work item produces work that genuinely accelerates you, if you provide it with clear scope, defined activities, specific tasks, and explicit deliverables.

This is why I've been developing an open-source framework called **AI-Assisted Work** ([github.com/dermot-obrien/ai-assisted-work](https://github.com/dermot-obrien/ai-assisted-work)). It provides:

**A work management system** where work items decompose into activities and tasks and is machine-readable, version-controlled, and designed for both human and AI execution:

```
Work Item
  └── Activity — the unit of assignment
        └── Task — sequential steps
              └── Deliverable — concrete output
```

**Agent coordination** that prevents conflicts. When multiple AI agents (or humans and agents) work in parallel, the framework uses file-based locks and optimistic versioning to ensure they don't overwrite each other's work. Each activity can only be claimed by one worker at a time.

The framework is opinionated by design. It works with Claude Code, GitHub Copilot, Cursor, Codex or any AI tool, because the structure lives in your local workspace or repository, not in a proprietary platform.

### What this looks like in practice

Here's a concrete example. I needed a comprehensive research report on WIP limits and cognitive load i.e. the research that underpins this article. In the old world, that's several days of reading papers, synthesising findings, and writing up recommendations.

Instead, I:

1. Created a work item with a research activity.
2. Defined the specific questions I wanted answered and got an agent to create the work item scope.
3. Ran an AI agent against those questions, which produced structured findings with sources.
4. Added my own research and practical experience.
5. Had the agent synthesise everything into design principles.

Total elapsed time: under two hours. The agent closed the research loop; I made the decisions about what to recommend. My cognitive load was "review and decide," not "research, synthesise, write, and decide."

That's the pattern. You think. You scope. You decide. The agent organises the scope into a specification and plan and then researches, drafts, and documents. Your WIP stays at three initiatives because the agent is handling the throughput bottleneck within each one.


## Start Here

You don't need to adopt a framework or install a tool. Start with the WIP limits:

1. **Tomorrow morning**, write down your five tasks for the day. Just five. If you can't choose, that's the problem talking.

2. **This Friday**, do a weekly review. List the 15 tasks for next week. Pick which three initiatives they serve. If you have more than three active initiatives, park one. It will still be there when you're ready.

3. **Apply the rule**: nothing new goes on until something comes off.

4. **When you're ready to explore AI augmentation**, look at structured frameworks that give agents clear scope, deliverables, and governance. My [AI-Assisted Work](https://github.com/dermot-obrien/ai-assisted-work) framework is one option, open sourced, designed and used by a highly experienced enterprise architect, and built to work with whatever AI tools you prefer. But there are many to choose from. Choose one that suits your individual work style.

The firehose isn't going to slow down. But you can build a better funnel.

## References

[^1]: Cowan, N. (2001). "The Magical Number 4 in Short-Term Memory: A Reconsideration of Mental Storage Capacity." *Behavioral and Brain Sciences*, 24(1), 87-114. See also: Cowan, N. (2010). "The Magical Mystery Four: How Is Working Memory Capacity Limited, and Why?" *Current Directions in Psychological Science*, 19(1), 51-57.

[^2]: Zeigarnik, B. (1927). "On Finished and Unfinished Tasks." *Psychologische Forschung*, 9, 1-85.

[^3]: Masicampo, E.J. & Baumeister, R.F. (2011). "Consider It Done! Plan Making Can Eliminate the Cognitive Effects of Unfulfilled Goals." *Journal of Personality and Social Psychology*, 101(4), 667-683.

[^4]: Leroy, S. (2009). "Why Is It So Hard to Do My Work? The Challenge of Attention Residue When Switching Between Work Tasks." *Organizational Behavior and Human Decision Processes*, 109(2), 168-181.

[^5]: Burkeman, O. (2021). *Four Thousand Weeks: Time Management for Mortals*. Farrar, Straus and Giroux.

[^6]: Newport, C. (2024). *Slow Productivity: The Lost Art of Accomplishment Without Burnout*. Portfolio/Penguin.

[^7]: Benson, J. & Barry, T.D. (2011). *Personal Kanban: Mapping Work, Navigating Life*. Modus Cooperandi Press.

[^8]: Babauta, L. "Zen to Done (ZTD): The Ultimate Simple Productivity System." zenhabits.net.

[^9]: Forte, T. (2022). *Building a Second Brain: A Proven Method to Organize Your Digital Life and Unlock Your Creative Potential*. Atria Books.

[^10]: Miessler, D. (2026). "Building a Personal AI Infrastructure (PAI)." https://danielmiessler.com/blog/personal-ai-infrastructure

[^11]: Jones, N.B. (2026). "Why 2026 Is the Year to Build a Second Brain." https://www.youtube.com/watch?v=0TpON5T-Sw4


*Dermot O'Brien is an enterprise architect and AI strategist with over 40 years in technology. He builds open-source frameworks for AI-assisted architecture work and writes about the intersection of enterprise architecture, AI, and practical productivity. Connect on https://www.linkedin.com/in/dermot-obrien/ or explore the AI-Assisted Work framework at [github.com/dermot-obrien/ai-assisted-work](https://github.com/dermot-obrien/ai-assisted-work).*