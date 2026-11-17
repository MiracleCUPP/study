from logging.config import fileConfig
from alembic import context
from flask import current_app
config=context.config
fileConfig(config.config_file_name)
def get_db(): return current_app.extensions["migrate"].db
def run_migrations_offline():
    context.configure(url=str(get_db().engine.url),target_metadata=get_db().metadata,literal_binds=True,compare_type=True)
    with context.begin_transaction(): context.run_migrations()
def run_migrations_online():
    connection=get_db().engine.connect()
    try:
        context.configure(connection=connection,target_metadata=get_db().metadata,compare_type=True)
        with context.begin_transaction(): context.run_migrations()
    finally: connection.close()
if context.is_offline_mode(): run_migrations_offline()
else: run_migrations_online()
