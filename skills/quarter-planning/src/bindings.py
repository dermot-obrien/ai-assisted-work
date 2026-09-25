# SPDX-License-Identifier: Apache-2.0
"""Where this workspace keeps the registers a quarter is planned from.

Nothing about a quarter's arithmetic is specific to a workspace, but every input to it
is: where the planning basis lives, how a quarter's folder is named, which file carries
the calendar, where the roadmap model and the deliverable register sit. Those are read
from `[suite.quarter-planning]` of the workspace's `.agents/skill-bindings.toml`, the
same file that binds every other skill in the suite.

Paths resolve against that file's directory, never the working directory, so a binding
means the same thing wherever the command is run from. A path may carry `{quarter}`,
which is replaced by the quarter slug, so one binding covers every quarter.

The assumptions themselves, working days, focus factor, expected absence, points per
person-day, are NOT configuration. They are data, they change per quarter, and they
carry their own justification, so they live in the planning basis register the binding
points at.
"""

import os
import re
import sys

try:
    import tomllib
except ModuleNotFoundError:  # pragma: no cover - Python 3.10 and older
    tomllib = None

SECTION = ("suite", "quarter-planning")
NAMES = (os.path.join(".agents", "skill-bindings.toml"), "skill-bindings.toml")

# Every key, with the default this skill falls back to. A workspace that happens to use
# these names needs no binding at all; one that does not overrides only what differs.
DEFAULTS = {
    "sources": "../change/ai-programme/roadmap/sources",
    "register": "../governance/deliverables/architecture-deliverables.csv",
    "basis": "../change/planning/{quarter}/{quarter}-planning-basis.csv",
    "calendar": "../change/planning/{quarter}/{quarter}-calendar.csv",
    "resourcing": "../change/planning/{quarter}/{quarter}-resourcing.csv",
    "quarterDir": "../change/planning/{quarter}",
    # How a quarter slug maps to the label the model records on a work item.
    "slugPattern": r"^fy(?P<fy>\d{2})-q(?P<q>[1-4])$",
    "quarterLabel": "Q{q}-FY{fy}",
    # Float comparison tolerance for the integrity checks.
    "tolerance": 0.05,
    # The approval stages a plan, an epic and a product move through, least advanced first.
    # The last one is approval, and approval is commitment.
    "approvalStages": "draft,sized,validated,approved",
}

PATH_KEYS = ("sources", "register", "basis", "calendar", "resourcing", "quarterDir")


def find_bindings(start):
    """The nearest binding file at or above `start`, or None."""
    d = os.path.abspath(start)
    if os.path.isfile(d):
        d = os.path.dirname(d)
    while True:
        for n in NAMES:
            p = os.path.join(d, n)
            if os.path.isfile(p):
                return p
        up = os.path.dirname(d)
        if up == d:
            return None
        d = up


def _section(doc):
    node = doc
    for part in SECTION:
        node = node.get(part) if isinstance(node, dict) else None
        if node is None:
            return {}
    return node if isinstance(node, dict) else {}


class Bindings:
    """Resolved locations for one quarter."""

    def __init__(self, quarter, start=None):
        self.quarter = quarter
        self.file = find_bindings(start or os.getcwd())
        values = dict(DEFAULTS)
        if self.file and tomllib:
            with open(self.file, "rb") as fh:
                values.update(_section(tomllib.load(fh)))
        elif self.file and not tomllib:
            sys.stderr.write(
                "quarter-planning: Python 3.11 or newer is needed to read "
                "skill-bindings.toml; falling back to the default layout\n")
        self.values = values
        self.base = os.path.dirname(self.file) if self.file else os.getcwd()

    def resolve(self, key):
        """A bound path, with {quarter} filled in, as an absolute path."""
        raw = str(self.values[key]).replace("{quarter}", self.quarter)
        return os.path.normpath(os.path.join(self.base, raw))

    def label(self):
        """The quarter label the model records, e.g. Q1-FY27 for fy27-q1."""
        m = re.match(self.values["slugPattern"], self.quarter)
        if not m:
            return None
        return self.values["quarterLabel"].format(**m.groupdict())

    @property
    def tolerance(self):
        return float(self.values["tolerance"])

    @property
    def approval_stages(self):
        """The approval stages in order, from a list or a comma-separated string."""
        raw = self.values["approvalStages"]
        items = raw if isinstance(raw, (list, tuple)) else str(raw).split(",")
        return [str(x).strip() for x in items if str(x).strip()]

    def missing(self):
        """Bound paths that do not exist, so a run can say which rather than crash."""
        out = []
        for k in PATH_KEYS:
            p = self.resolve(k)
            if not os.path.exists(p):
                out.append((k, p))
        return out

    def describe(self):
        lines = [f"  bindings: {self.file or '(none found; using defaults)'}"]
        for k in PATH_KEYS:
            p = self.resolve(k)
            lines.append(f"    {k:<11} {p}{'' if os.path.exists(p) else '   MISSING'}")
        lines.append(f"    {'label':<11} {self.label()}")
        lines.append(f"    {'approval':<11} {' > '.join(self.approval_stages)}")
        return "\n".join(lines)
