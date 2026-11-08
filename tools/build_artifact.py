"""Bundle index.html, styles.css, app.js and tour.js into one page for publishing as a claude.ai artifact.

Usage: python3 tools/build_artifact.py OUTPUT.html
The artifact host adds the <!doctype>/<head>/<body> skeleton, so the output starts with <title>.
"""
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text()
css = (root / "styles.css").read_text()
scripts = [(root / name).read_text() for name in ("app.js", "tour.js")]

title = re.search(r"<title>(.*?)</title>", html).group(1)
fonts = "\n".join(re.findall(r'<link rel="(?:preconnect|stylesheet)" href="https://fonts\.[^>]*>', html))
body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
body = re.sub(r'\s*<script src="[^"]+"></script>', "", body)

for code in scripts:
    if "</script" in code:
        sys.exit("A script contains </script and would break the bundle.")

out = "\n".join([
    f"<title>{title}</title>",
    '<meta name="claude:viewport-fit-sides" content="cover">',
    fonts,
    f"<style>\n{css}\n</style>",
    body.strip(),
    *[f"<script>\n{code}\n</script>" for code in scripts],
]) + "\n"
pathlib.Path(sys.argv[1]).write_text(out)
print(f"wrote {sys.argv[1]} ({len(out) // 1024} KB)")
