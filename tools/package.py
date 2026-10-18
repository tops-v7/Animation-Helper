"""Build a clean, reproducible installable module ZIP; no third-party packages."""
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / "module.json").read_text())
module_id = manifest["id"]
files = [root / "module.json", root / "README.md", root / "LICENSE", root / "CHANGELOG.md"]
for folder in ["scripts", "styles", "docs"]:
    files.extend(p for p in (root / folder).rglob("*") if p.is_file())
for entry in manifest["esmodules"] + manifest["styles"]:
    assert (root / entry).is_file(), f"Missing manifest entry: {entry}"
out = root / "dist" / f'{module_id}-{manifest["version"]}.zip'
out.parent.mkdir(exist_ok=True)
with ZipFile(out, "w", compression=ZIP_DEFLATED) as archive:
    for path in sorted(files):
        info = ZipInfo(f"{module_id}/{path.relative_to(root).as_posix()}", (2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, path.read_bytes())
with ZipFile(out) as archive:
    assert archive.testzip() is None
    assert json.loads(archive.read(f"{module_id}/module.json"))["id"] == module_id
print(out)
