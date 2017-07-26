from config import config
'''
The cloudstorage service is responsible for handling file uploads
(such as attachments)
'''


class StorageProvider(object):
    ''' A base class storage provider interface. '''

    def upload(self, metadata, content):
        ''' Uploads a file to cloud storage

        Args:
        metadata - The models.Attachment metadata for the upload
        content - The file content to write
        '''
        raise NotImplementedError

    def get(self, filename):
        ''' Retrieves a file from cloud storage

        Args:
        filename - The name of the file to fetch
        '''
        raise NotImplementedError


class GoogleCloudStorageProvider(StorageProvider):
    ''' A storage provider using Google Cloud Storage '''

    def __init__(self):
        self.bucket_name = os.environ.get(
            'BUCKET_NAME', app_identity.get_default_gcs_bucket_name())

    def upload(self, attachment, content):
        ''' Uploads a file to the default cloud storage bucket

        Args:
        attachment - The models.Attachment metadata for the file
        content - The file content
        '''
        filename = '/{}/{}'.format(self.bucket_name,
                                   attachment.stored_filename)
        write_retry_params = gcs.RetryParams(backoff_factor=1.1)
        gcs_file = gcs.open(
            filename,
            'w',
            content_type=attachment.mime_type,
            retry_params=write_retry_params)
        gcs_file.write(content)
        gcs_file.close()

    def get(self, filename):
        ''' Gets a file from the default cloud storage bucket

        Args:
        filename - The filename to fetch
        '''
        filename = '/{}/{}'.format(self.bucket_name, filename)
        gcs_file = gcs.open(filename, 'r')
        content = gcs_file.read()
        gcs_file.close()
        return content


if config['storage']['provider'] == 'gae':
    import os
    import cloudstorage as gcs
    from google.appengine.api import app_identity

    storage_provider = GoogleCloudStorageProvider()
