# Contributing

Thanks for improving the Kicbac skill.

## Validate changes

```sh
python3 /Users/aakash/.codex/skills/.system/skill-creator/scripts/quick_validate.py .
npx skills add . --list --full-depth
```

## Editing rules

- Keep `SKILL.md` compact and under 500 lines.
- Put detailed SDK or workflow guidance in `references/`.
- Keep references one level deep from `SKILL.md`.
- Do not invent SDK methods.
- Do not add unsafe payment-data examples.
