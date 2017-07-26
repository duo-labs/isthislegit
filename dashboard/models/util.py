from google.appengine.ext import ndb

class DateTimeProperty(ndb.DateTimeProperty):
    def _get_for_dict(self, entity):
        value = super(DateTimeProperty, self)._get_for_dict(entity)
        if not value:
            return None
        return value.isoformat()

class DateProperty(ndb.DateProperty):
    def _get_for_dict(self, entity):
        value = super(DateProperty, self)._get_for_dict(entity)
        if not value:
            return None
        return str(value)
