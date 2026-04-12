# Comandos requeridos
pip-compile requirements/lock.in --output-file=requirements/requirements-lock.txt
pip-compile requirements/dev.in --output-file=requirements/requirements-dev.txt
python script.py --all

# Comandos opcionales
pip-compile --upgrade
pip-compile --upgrade-package django

# Comandos actualizar venv
pip-compile --upgrade requirements/dev.in requirements/lock.in --output-file=requirements.txt
pip-sync requirements.txt
