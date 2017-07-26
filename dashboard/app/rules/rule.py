class Rule(object):
    ''' A Rule is an interface designed for implementing basic rules.

    Each subclass of Rule must support the following methods:

    * match(EmailReport): bool - Returns whether the rule applies to the EmailReport

    * process(EmailReport): void - Processes the EmailReport (no return value)
    '''

    def match(report):
        ''' Returns whether or not the rule matches the provided EmailReport based on
        one or more Conditions. 
        '''
        raise NotImplementedError

    def process(report):
        ''' Processes the email report and executes one or more Actions.
        '''
        raise NotImplementedError


class Condition(object):
    ''' A Condition is an interface that potentially matches an EmailReport
    '''

    def match(report):
        raise NotImplementedError


class Action(object):
    ''' An Action is an interface that can take an EmailReport (with other kwargs)
    and perform a function.
    '''

    def process(report):
        raise NotImplementedError
