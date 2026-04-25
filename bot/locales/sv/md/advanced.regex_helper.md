**Regex (Regular Expression) Tips**
Regex lets you match thread names using patterns. Here are some simple examples to get started:

> **Match threads containing a word:**
> \`._bug._\` → Matches threads with "bug" anywhere in the name (e.g., "report-bug", "bug fix").
> \`^help\` → Matches threads **starting with** "help" (e.g., "help-me", "help-desired").

> **Match exact phrases:** > \`^bug report$\` → Matches _only_ threads named exactly "bug report".

> **Exclude threads:**
> Add \`!\` at the start to invert the match (e.g., \`!._wip._\` ignores threads with "wip").

📖 **[Full Regex Guide](https://docs.threadwatcher.xyz/usage/advanced-filtering#regex)**
✨ **[AI Regex Generator](https://rgx.tools/)** (External)
🔗 **[Regex Cheat Sheet](https://www.rexegg.com/regex-quickstart.html)** (External)
💡 _Need help? Try your pattern with the **Test Regex** button!_
