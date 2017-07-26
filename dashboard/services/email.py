from config import config
'''
The email service is responsible for fetching, sending, and (potentially) deleting email on behalf of IsThisLegit.
'''


class EmailFetchError(Exception):
    ''' A generic error when fetching emails from the external service.'''

    def __init__(self, message):
        ''' Creates a new instance of the error '''
        self.message = message
        super(EmailFetchError, self).__init__(message)

    def __str__(self):
        ''' Returns a string representation of the error '''
        return self.message


class EmailProvider(object):
    def send(self, **kwargs):
        ''' Sends an email using the provider's client

        It is expected that the provider can handle the following kwargs:
        sender - the email sender
        to - list of recipients in the "To" field
        bcc - list of recipients in the "Bcc" field
        cc - list of recipients in the "Cc" field
        headers - optional headers
        html - html body
        body - plaintext body
        subject - email subject
        '''
        raise NotImplementedError

    def fetch(self, **kwargs):
        ''' Fetches an email using the provider's client.

        For the initial release, this will only include fetching emails
        from the Gmail API.
        '''
        raise NotImplementedError


class SMTPProvider(EmailProvider):
    ''' An email provider leveraging basic SMTP connections '''

    def send(self, **kwargs):
        raise NotImplementedError

    def fetch(self, **kwargs):
        raise NotImplementedError


class AppEngineProvider(EmailProvider):
    ''' An email provider leveraging the App Engine Mail API.
    
    Every `sender` must be listed as an authorized sender in the GAE Project console:
    https://cloud.google.com/appengine/docs/standard/python/mail/#who_can_send_mail
    '''

    def send(self, **kwargs):
        ''' Sends an email using the App Engine Mail API.
        
        Raises an InvalidEmailError if an invalid email address was specified.
        '''
        message = mail.EmailMessage(**kwargs)
        message.send()

    def fetch(self, **kwargs):
        ''' Fetches an email using the Gmail API users.messages.get()
        method. It leverages the IsThisLegit service account to impersonate
        the user in order to retrieve the email by message ID. This prevents
        users from having to manually accept the OAuth permission dialog before
        reporting phishing emails.

        Expected kwargs:

        userId - The userID who reported the email
        messageId - The Gmail message ID to fetch
        '''
        userId = kwargs.get('userId')
        messageId = kwargs.get('messageId')

        scopes = ['https://www.googleapis.com/auth/gmail.readonly']
        credentials = ServiceAccountCredentials.from_json_keyfile_name(
            config['gae']['service_account_key'], scopes=scopes)
        delegated_credentials = credentials.create_delegated(userId)
        http_auth = delegated_credentials.authorize(Http())
        service = build('gmail', 'v1', http=http_auth)
        response = service.users().messages().get(
            userId=userId, id=messageId, format='raw').execute()
        if not response or 'raw' not in response:
            raise EmailFetchError('Error fetching email: User {}, thread {}'.
                                  format(userId, messageId))
        message = base64.urlsafe_b64decode(str(response['raw']))
        return message


if config['email']['provider'] == 'gae':
    import base64

    from google.appengine.api import mail
    from oauth2client.service_account import ServiceAccountCredentials
    from httplib2 import Http
    from googleapiclient.discovery import build

    email_provider = AppEngineProvider()
