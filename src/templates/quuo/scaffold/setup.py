from pathlib import Path

from setuptools import setup


def get_environment():
    env = {}
    env_file = Path(".env")
    if env_file.exists():
        with env_file.open("r", encoding="utf-8") as f:
            for line in f:
                if "=" in line:
                    key, value = line.strip().split("=", 1)
                    env[key] = value
    return env


def read_requirements_file(path, env, preserve_format=False):
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8").splitlines()
    processed = []
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            line = (
                line
                .replace("USERNAME", env.get("REPO_USER", ""))
                .replace("PASSWORD", env.get("REPO_PASS", ""))
            )
            if "#egg=" in line:
                url, egg = line.split("#egg=")
                line = f"{egg.strip()} @ {url.strip()}"
        if preserve_format or (stripped and not stripped.startswith("#")):
            processed.append(line)
    return processed


def collect_requirements(dev, git, lock, write):
    reqs = {}
    env = get_environment()
    if lock:
        reqs["lock"] = read_requirements_file(
            Path("requirements/requirements-lock.txt"), env, write)
    if dev:
        reqs["dev"] = read_requirements_file(
            Path("requirements/requirements-dev.txt"), env, write)
    if git:
        reqs["git"] = read_requirements_file(
            Path("requirements/requirements-git.txt"), env, write)
    return reqs


def write_requirements_file(requirements: dict, filename: str):
    with open(filename, "w", encoding="utf-8") as f:
        for key, deps in requirements.items():
            f.write(f"# --- {key.upper()} DEPENDENCIES ---\n")
            for dep in deps:
                f.write(dep + "\n")
            f.write("\n")


if __name__ == "__main__":
    requisites = collect_requirements(dev=True, git=True, lock=True, write=False)
    setup(
        name="quuo-nombre-repo",
        version="3.0.0",
        author="Quuo",
        author_email="red5g@red5g.co",
        package_dir={
            'NombreModulo.Classes': 'Classes',
        },
        python_requires=">=3.11",
        install_requires=[],
        extras_require={
            "dev": requisites.get("dev", []),
            "lock": requisites.get("lock", []),
            "git": requisites.get("git", []),
        },
    )
