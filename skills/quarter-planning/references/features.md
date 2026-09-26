# The feature layer

An optional backlog layer above the epic, in the shape the Scaled Agile Framework gives it.
Off until the workspace binds `features`; a workspace that does not bind it plans exactly as
before.

## The chain

| Level | Scaled Agile | Record | Owned by |
|---|---|---|---|
| Consumer | Customer, business solution | A use case or solution in the workspace's demand model | The business |
| Product | Solution | A row in the product register: `id`, `name`, `platform`, `team` | A platform team |
| Feature | Feature, in the ART backlog | A row in the feature register, always against one product | The product's team |
| Epic | Epic, taken into a Program Increment | A work item in the planning model | The quarter's plan |
| Story | Story, in a team backlog | A work item citing the feature in `feature_ids` | The team building it |

Consumers ordinarily use products and features that already exist. When one needs something
new, it asks the product's team for a feature. Where the feature needs platform work, a
quarter takes it on through an epic, the epic's stories build it, and it goes live as part of
the product.

## Assignment happens in two steps

1. **Feature to epic.** The feature register's `epic` column assigns it, and the epic names
   it as a deliverable of the `featureType` type (default `feature`) whose name starts with
   the feature id, such as `FE-004 Stop button for the portal chat`. The deliverable gives the
   feature its size in the quarter.
2. **Story to feature.** Separately, and later, each work item that delivers part of the
   feature lists it in `feature_ids` in its `progress.yaml`. The feature does not list its
   stories; the stories cite the feature.

## Register contracts

A workspace keeps whatever other columns it likes. These are the ones read.

| Register | Binding | Columns read |
|---|---|---|
| Features | `features` | `id`, `title`, `product`, `epic`, `status`, `value`, `time_criticality`, `risk_reduction`, `job_size` |
| Products | `products`, optional | `id`, `name`, `platform`, `team` |

Statuses come from `featureStatuses`, least advanced first. The default is `analyzing,
backlog, implementing, validating, releasing, done, rejected`. The first status is not yet
ready to plan.

WSJF is (value + time criticality + risk reduction) / job size, each scored on 1, 2, 3, 5,
8, 13, 20 relative to the product's other features.

## What the validation checks (section 10)

| Finding | Result |
|---|---|
| A feature deliverable whose name does not start with a registered feature id | Fails |
| A feature named on an epic the register does not assign it to, or assigns to no epic | Fails |
| A feature named on two epics | Fails |
| A status not in `featureStatuses`, a WSJF factor off the scale | Fails |
| A feature with no product, or, with `products` bound, a product not registered | Fails |
| A feature assigned to a committed epic but not named on it, so its size is not planned | Warning |
| A feature named on an epic while still in its first status, or rejected | Warning |
| A feature past its first status with no WSJF score | Warning |

## What the card shows

With the layer bound, each epic card gains two sections after its deliverables:

- **Features.** Every feature named on the epic, then any assigned but not yet named, with
  product, status, WSJF, the stories citing it, and whether it is planned.
- **Products and platforms supported.** The products those features belong to, with the
  platform and team offering each.

## The backlog view

`quarter.py --quarter <slug> --backlog` prints each product's features ranked by WSJF, with the
epic delivering each and the work items citing it, and lists any feature id cited by a work
item that the register does not hold. It reads nothing about the quarter's capacity.
