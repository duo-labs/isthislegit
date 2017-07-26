from os import environ, path

import toml

def load_config(config_path=None):
    if config_path is None:
        config_path = environ.get(
            'ISTHISLEGIT_CONFIG',
            path.join(path.dirname(__file__), 'isthislegit.toml'),
        )

    with open(config_path) as f:
        return toml.load(f)

config = load_config()
