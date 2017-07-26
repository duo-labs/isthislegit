from app.report import report_blueprint
from app.views import app_blueprint
from app.api import api_blueprint
from app.ajax import ajax_blueprint

from extensions import csrf_protect
from flask import Flask, render_template

import os

app = Flask(__name__, static_url_path='/static')
#app.config['DEBUG'] = True

app.register_blueprint(report_blueprint)
app.register_blueprint(app_blueprint)
app.register_blueprint(api_blueprint)
app.register_blueprint(ajax_blueprint)
app.secret_key = os.urandom(24).encode('hex')

csrf_protect.init_app(app)


@app.errorhandler(404)
def page_not_found(error):
    return render_template('404.html'), 404


@app.errorhandler(500)
def internal_server_error(error):
    return render_template('500.html'), 500
