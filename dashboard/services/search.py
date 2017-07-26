from config import config

from google.appengine.api import search

class SearchProvider(object):

    def index(self, report):
        ''' Indexes a models.EmailReport object into the search providers datastore.

        :param report: An instance of models.EmailReport
        '''
        raise NotImplementedError

    def search(self, query):
        ''' Searches the provider's datastore for models.EmailReport instances that match the provided query. This is dependent on the provider's search implementation.

        :param query: str - The query to search for
        '''
        raise NotImplementedError

    def delete(self, doc_id):
        ''' Deletes the document from the provider's datastore

        :param doc_id: str - The doc_id to delete
        '''
        raise NotImplementedError

class ElasticsearchProvider(SearchProvider):
    ''' A search provider using Elasticsearch '''

    def index(self, report):
        raise NotImplementedError

    def search(self, query):
        raise NotImplementedError

    def delete(self, doc_id):
        raise NotImplementedError

class AppEngineProvider(SearchProvider):
    def __init__(self):
        self.store = search.Index(name='isthislegit', namespace='reports')

    def _create_doc(self, report):
        doc_fields = [
            search.TextField(name='report_type', value=report.report_type),
            search.TextField(name='thread_id', value=report.thread_id),
            search.TextField(name='history_id', value=report.history_id),
            search.DateField(name='date_received', value=report.date_received),
            search.DateField(name='date_reported', value=report.date_reported),
            search.DateField(name='date_responded', value=report.date_responded),
            search.TextField(name='has_responded', value=str(report.has_responded)),
            search.TextField(name='status', value=report.status),
            search.TextField(name='sender', value=str(report.sender)),
            search.TextField(name='reported_by', value=report.reported_by),
            search.TextField(name='subject', value=report.subject),
            search.HtmlField(name='html', value=report.html),
            search.TextField(name='text', value=report.text)
        ]
        return search.Document(doc_id=str(report.key.id()), fields=doc_fields)

    def index(self, report):
        doc = self._create_doc(report)
        self.store.put(doc)

    def search(self, query):
        print('Searching for {}'.format(query))
        return self.store.search(query)

    def delete(self, doc_id):
        return self.store.delete(doc_id)

if config['search']['provider'] == 'gae':
    search_provider = AppEngineProvider()
