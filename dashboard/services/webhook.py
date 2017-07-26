from config import config
import requests

class WebhookProvider(object):
    
    def send(self, **kwargs):
        raise NotImplementedError

class RequestsWebhookProvider(object):
    
    def send(self, **kwargs):
        for url in config['webhook']['urls']:
            requests.post(url, json=kwargs.get('payload'))

if config['webhook']['provider'] == 'gae':
    import requests_toolbelt.adapters.appengine
    requests_toolbelt.adapters.appengine.monkeypatch()

webhook_provider = RequestsWebhookProvider()
