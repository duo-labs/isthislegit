from google.appengine.ext import ndb

from models.util import DateTimeProperty

class Template(ndb.Model):
    """
    Template - represents an email Template used to respond to Email Reports
    """
    name = ndb.StringProperty(required=True)
    text = ndb.StringProperty()
    sender = ndb.StringProperty()
    subject = ndb.StringProperty()
    owner_domain = ndb.StringProperty(required=True)
    date_created = DateTimeProperty(indexed=False, auto_now_add=True)
    date_updated = DateTimeProperty(indexed=False, auto_now=True)
    created_by = ndb.StringProperty(required=True)

    @classmethod
    def domain_query(cls, domain):
        """ Returns a query scoped to the given domain """
        return cls.query(cls.owner_domain == domain)

    @classmethod
    def get_by_name(cls, base_query, name):
        """ Returns the template that matches the given name."""
        return base_query.query(cls.name == name).get()
