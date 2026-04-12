import sys

from setup import collect_requirements, write_requirements_file


if __name__ == "__main__":
    dev = "--dev" in sys.argv

    reqs = collect_requirements(dev=dev, git=True, lock=True, write=True)
    write_requirements_file(reqs, "requirements.txt")
    print("Archivo requirements.txt generado.")
