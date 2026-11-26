# Skill conflicts

Detects skill conflicts by grouping the installed skills into capability
buckets (search, research, code review, diagram, office, image, browser, git,
memory, skill management, share) and flagging buckets with more than one
member.

## Usage

Ask the agent to run it, for example:

> 检查一下当前有没有功能重叠的 skill

The agent calls the `inspect_skill_conflicts` tool, which returns a grouped
report. Each line shows the skill name and its source, so you can tell where a
skill comes from before removing it.

## Limitations

The grouping is keyword-based over the skill name and description. It flags
likely redundancy, not proven conflicts; review each bucket before deleting
anything.
