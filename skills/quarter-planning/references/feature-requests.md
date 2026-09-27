# The feature-request layer

An optional demand layer beside the plan, in the shape the Scaled Agile Framework gives it.
Off until the workspace binds `requests`; a workspace that does not bind it plans exactly as
before.

## The chain

| Level | Scaled Agile | Record | Owned by |
|---|---|---|---|
| Consumer | Customer, business solution | A use case or solution in the workspace's demand model | The business |
| Product | Solution | A row in the product register: `id`, `name`, `platform`, `team` | A platform team |
| Feature request | A request in the product's backlog, before it is a feature | A row in the request register, always against one product | The product's team |
| Epic | Feature, taken into a Program Increment | A work item in the planning model | The quarter's plan |
| Story | Story | An activity of the epic, optionally citing requests in `request_ids` | The team building it |

Consumers ordinarily use products and features that already exist. When one needs something
new, it raises a feature request with the product's team, which ranks it. Where the request
needs a platform build, a quarter takes it on through an epic. The epic is the unit of
planning: it carries the size, through its deliverables, and the quarter's capacity. The
request adds no points of its own. The epic's stories build it, and it goes live as part of
the product.

## Assignment happens in two steps

1. **Request to epic.** The request register's `epic` column records the epic that takes it
   on. One epic may take on several requests, where one build meets them all.
2. **Story to request.** Separately, and later, each story that builds part of a request cites
   it in `request_ids`. Stories are read from the activities in each work item's
   `progress.yaml` and from `activity` records in `<sources>/activity.yaml`. The request does
   not list its stories.

## Register contracts

A workspace keeps whatever other columns it likes. These are the ones read.

| Register | Binding | Columns read |
|---|---|---|
| Feature requests | `requests` | `id`, `title`, `product`, `epic`, `status`, `requested_by`, `value`, `time_criticality`, `risk_reduction`, `job_size` |
| Products | `products`, optional | `id`, `name`, `platform`, `team` (`owner` where there is no `team`) |

Statuses come from `requestStatuses`, least advanced first. The default is `analyzing,
backlog, implementing, validating, releasing, done, rejected`. The first is not yet ready to
build.

WSJF is (value + time criticality + risk reduction) / job size, each scored on 1, 2, 3, 5,
8, 13, 20 relative to the product's other requests.

## What the validation checks (section 10)

| Finding | Result |
|---|---|
| A request assigned to an epic the planning model does not hold | Fails |
| A status not in `requestStatuses`, a WSJF factor off the scale | Fails |
| A request with no product, or, with `products` bound, a product not registered | Fails |
| A request assigned to a committed epic while still in its first status, or rejected | Warning |
| A request past its first status with no WSJF score | Warning |
| A story citing a request the register does not hold | Warning |

## What the card shows

With the layer bound, each epic card gains two sections after its deliverables:

- **Feature requests.** Every request the epic takes on, with its product, who asked for it,
  status, WSJF and the stories citing it.
- **Products and platforms supported.** The products those requests are raised against, with
  the platform and team offering each.

## The backlog view

`quarter.py --quarter <slug> --backlog` prints each product's requests ranked by WSJF, with the
epic taking each on and the stories citing it, and lists any request id cited by a story that
the register does not hold. It reads nothing about the quarter's capacity.
