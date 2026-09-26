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

No path has a default. A skill that shipped one workspace's layout as its fallback would
be carrying that workspace around in it, and a workspace that had not bound yet would
read nothing instead of being told what it has not declared. An unbound run names the
keys and stops.

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

# The paths a workspace must declare. None of them has a default, deliberately. A default
# would be one workspace's directory layout written into a skill that claims not to have
# one, and it would be wrong everywhere else while looking like a feature: a workspace that
# had not bound yet would read nothing rather than be told what it has not said.
PATH_KEYS = ("sources", "register", "basis", "calendar", "resourcing", "quarterDir")

# Paths a workspace may declare to opt in to more. Each is optional, and a workspace that
# declares none of them validates exactly as before.
#   ladder        the definition ladder, a CSV of rung,name,description in ascending order
#   epicsDir      the folder holding each epic's hand-written home folder
#   cardsDir      where the generated epic cards and the stage grid are written
#   workItemsDir  AAW work items, read for epics whose progress.yaml names this quarter
OPTIONAL_PATH_KEYS = ("ladder", "epicsDir", "cardsDir", "workItemsDir")

# Optional paths that are written rather than read, so their absence is not a fault.
WRITTEN_KEYS = ("cardsDir",)

# What does have a default is convention rather than location, and is the same question
# every workspace answers the same way until it doesn't.
DEFAULTS = {
    # How a quarter slug maps to the label the model records on a work item.
    "slugPattern": r"^fy(?P<fy>\d{2})-q(?P<q>[1-4])$",
    "quarterLabel": "Q{q}-FY{fy}",
    # Float comparison tolerance for the integrity checks.
    "tolerance": 0.05,
    # The approval stages a plan, an epic and a product move through, least advanced first.
    # The last one is approval, and approval is commitment.
    "approvalStages": "draft,sized,validated,approved",
}


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
        self.declared_keys = set()
        if self.file and tomllib:
            with open(self.file, "rb") as fh:
                section = _section(tomllib.load(fh))
            self.declared_keys = set(section)
            values.update(section)
        elif self.file and not tomllib:
            sys.stderr.write(
                "quarter-planning: Python 3.11 or newer is needed to read "
                "skill-bindings.toml, so nothing below can be located\n")
        self.values = values
        self.base = os.path.dirname(self.file) if self.file else os.getcwd()

    def undeclared(self):
        """Path keys this workspace has not bound. Nothing can be read without them."""
        return [k for k in PATH_KEYS if not str(self.values.get(k) or "").strip()]

    def resolve(self, key):
        """A bound path, with {quarter} filled in, as an absolute path."""
        raw = self.values.get(key)
        if raw is None or not str(raw).strip():
            raise KeyError(
                "'%s' is not bound. Declare it in [suite.quarter-planning] of %s"
                % (key, self.file or ".agents/skill-bindings.toml"))
        raw = str(raw).replace("{quarter}", self.quarter)
        return os.path.normpath(os.path.join(self.base, raw))

    def declared(self, key):
        """Whether the workspace states this key itself, rather than taking a default."""
        return key in self.declared_keys and str(self.values.get(key) or "").strip() != ""

    def optional(self, key):
        """An optional bound path, resolved, or None when the workspace has not declared it."""
        return self.resolve(key) if self.declared(key) else None

    def command(self, role):
        """The workspace's own command for a role, from the commands table, or None."""
        table = self.values.get("commands")
        if isinstance(table, dict):
            value = table.get(role)
            return str(value).strip() if value else None
        return None

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
        undeclared = set(self.undeclared())
        out = []
        for k in PATH_KEYS:
            if k in undeclared:
                continue
            p = self.resolve(k)
            if not os.path.exists(p):
                out.append((k, p))
        for k in OPTIONAL_PATH_KEYS:
            if k in WRITTEN_KEYS or not self.declared(k):
                continue
            p = self.resolve(k)
            if not os.path.exists(p):
                out.append((k, p))
        return out

    def describe(self):
        lines = [f"  bindings: {self.file or '(no skill-bindings.toml found)'}"]
        undeclared = set(self.undeclared())
        for k in PATH_KEYS:
            if k in undeclared:
                lines.append(f"    {k:<12} NOT DECLARED")
                continue
            p = self.resolve(k)
            lines.append(f"    {k:<12} {p}{'' if os.path.exists(p) else '   MISSING'}")
        for k in OPTIONAL_PATH_KEYS:
            if not self.declared(k):
                lines.append(f"    {k:<12} not declared (optional)")
                continue
            p = self.resolve(k)
            gone = not os.path.exists(p)
            flag = ("   not yet written" if k in WRITTEN_KEYS else "   MISSING") if gone else ""
            lines.append(f"    {k:<12} {p}{flag}")
        lines.append(f"    {'label':<12} {self.label()}")
        if not self.declared("slugPattern"):
            lines.append("  note: slugPattern is not declared, so the fiscal-year default "
                         f"{DEFAULTS['slugPattern']} is in use.")
        lines.append(f"    {'approval':<12} {' > '.join(self.approval_stages)}")
        return "\n".join(lines)
