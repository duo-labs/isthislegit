from config import config


class WorkerProvider(object):
    
    def add_task(self, func, *args, **kwargs):
        ''' Performs a task asynchronously.

        :param func: A function to call asynchronously
        :param args: Positional arguments to send to the function
        :param kwargs: Keyword arguments to send to the function
        '''
        raise NotImplementedError

class AppEngineDeferredProvider(WorkerProvider):
    
    def add_task(self, func, *args, **kwargs):
        ''' Performs a task asynchronously using the GAE deferred library '''
        return deferred.defer(func, *args, **kwargs)

if config['worker']['provider'] == 'gae':
    from google.appengine.ext import deferred
    worker_provider = AppEngineDeferredProvider()
