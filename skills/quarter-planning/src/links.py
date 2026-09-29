# SPDX-License-Identifier: Apache-2.0
"""Links from planning documents to each epic's and each story's own page on the site.

Where a record is published is data in the model, not configuration: the epic in
`work_item.yaml` and the story in `activity.yaml`, both under the `sources` binding, each
carry `site_route`, the route of its own page relative to the site root, such as
/epics/EP-001/. The workspace binds one thing, `siteUrl`, the root every route is appended
to. Moving from a local preview to the published site changes that one value and no record.

A route is meant to be stable, carrying no quarter or grouping, so a link in a document or
PDF already circulated keeps working when a story moves quarter.

A document names an epic or a story with a Markdown reference link, [EP-001] or [EP-001-A2],
and keeps the definition at its foot. rewrite() points every definition whose label resolves
to a record at that record's page, and leaves every other definition alone. A label resolves
when it is an epic id, a story id, or, where the workspace binds `externalRefSystem`, the
external_id an epic carries in external_refs for that system, so a tracker key used as the
label links to the epic's own page rather than to the tracker.

  Links(bind, items)       resolver over the epics (as load_items returns them) and stories
  Links.url(ref)           the page's URL, or None when ref names no record or no route
  Links.missing            refs asked for that name a record with no site_route
  rewrite(text, links)     -> text with every resolvable definition pointed at its page
"""
import io
import os
import re

import yaml

DEFINITION = re.compile(r'^\[(?P<ref>[^\]\s]+)\]:[ \t]*\S+[ \t]*$', re.M)


def load_stories(bind):
    """The story records, from activity.yaml beside work_item.yaml, or none."""
    path = os.path.join(bind.resolve('sources'), 'activity.yaml')
    if not os.path.exists(path):
        return []
    with io.open(path, encoding='utf-8') as fh:
        return (yaml.safe_load(fh) or {}).get('activity') or []


class Links:
    """Resolves epic ids, story ids and external keys to their pages on the site."""

    def __init__(self, bind, items, stories=None):
        root = str(bind.values.get('siteUrl') or '').strip()
        self.root = root.rstrip('/') or None
        self.routes = {}
        records = list(items) + list(load_stories(bind) if stories is None else stories)
        for r in records:
            if r.get('id'):
                self.routes[str(r['id'])] = str(r.get('site_route') or '').strip() or None
        system = str(bind.values.get('externalRefSystem') or '').strip().lower()
        self.keys = {}
        if system:
            for w in items:
                for ref in w.get('external_refs') or []:
                    if str(ref.get('system') or '').lower() == system and ref.get('external_id'):
                        self.keys[str(ref['external_id'])] = str(w['id'])
        self.missing = set()

    def record(self, ref):
        """The record id a reference names, or None when it names nothing in the model."""
        ref = self.keys.get(ref, ref)
        return ref if ref in self.routes else None

    def url(self, ref):
        rid = self.record(ref)
        if rid is None or self.root is None:
            return None
        route = self.routes[rid]
        if not route:
            self.missing.add(rid)
            return None
        return self.root + '/' + route.lstrip('/')


def rewrite(text, links):
    """Point every definition whose label names a routed record at that record's page."""
    def sub(m):
        url = links.url(m.group('ref'))
        return '[%s]: %s' % (m.group('ref'), url) if url else m.group(0)
    return DEFINITION.sub(sub, text)
