This is a fork of https://github.com/mailgun/flanker. Modifications were made to remove reliance on C bindings, which are not supported by Google App Engine.

The following changes were made:

* All occurrences of the `regex` library were replaced by the standard `re` library to make the library compatible with Google App Engine.
* The reliance on `cchardet` have been removed and replaced by `chardet`.
