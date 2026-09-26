# SPDX-License-Identifier: Apache-2.0
"""Plain-text formatting shared by the report's sections.

Output is ASCII only. A Unicode minus or dash in a table kills the run on a Windows console
partway through, which makes the error count look smaller than it is.
"""
import re
import textwrap


def signed(x):
    """One decimal place with an explicit sign, for an over or under figure."""
    return ('%+.1f' % x) if abs(x) >= 0.05 else '0.0'


def deduct(x):
    """A deduction, shown negative, with no signed zero for the people who have none."""
    return ('-%.1f' % x) if abs(x) >= 0.05 else '0.0'


def pts(x):
    """Points to two decimals, trimmed to one where the second is zero: 0.25, 2.0, 9.25."""
    s = '%.2f' % (x + 0.0)
    if s == '-0.00':
        s = '0.00'
    return s[:-1] if s.endswith('0') else s


def table(head, body, foot=None, wrap=None):
    """Plain fixed-width table. Numeric columns right-aligned, text left.

    `wrap` maps a column index to a width. A longer cell in that column is wrapped onto
    continuation lines rather than cut, so nothing written in a register is hidden.
    """
    numeric = [all(re.match(r'^[-+]?[\d.]+%?$', str(r[i]).strip() or 'x')
                   for r in body)
               for i in range(len(head))]
    lines = []
    for r in body:
        cells = [str(c) for c in r]
        parts = {i: (textwrap.wrap(cells[i], w) or ['']) for i, w in (wrap or {}).items()
                 if i < len(cells)}
        depth = max([len(p) for p in parts.values()] or [1])
        for n in range(depth):
            lines.append([(parts[i][n] if n < len(parts[i]) else '') if i in parts
                          else (cells[i] if n == 0 else '') for i in range(len(cells))])
    grid = [head] + lines + ([foot] if foot else [])
    width = [max(len(str(r[i])) for r in grid) for i in range(len(head))]

    def line(cells):
        return '  ' + ' '.join(
            (str(c).rjust(width[i]) if numeric[i] else str(c).ljust(width[i]))
            for i, c in enumerate(cells)).rstrip()

    rule = '  ' + ' '.join('-' * n for n in width)
    out = [line(head), rule] + [line(r) for r in lines]
    if foot:
        out += [rule, line(foot)]
    return '\n'.join(out)
