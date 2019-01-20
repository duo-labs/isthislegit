FROM google/cloud-sdk:alpine
LABEL maintainer="jwright@duosecurity.com"

# Install build dependencies
RUN apk add --update \
    py-pip \
    python2-dev \
    libffi-dev \
    openssl-dev \
    yarn \
    build-base \
    && rm -rf /var/cache/apk/*

# Install missing gcloud components
RUN gcloud components update
RUN gcloud components install --quiet \
    app-engine-python \
    app-engine-python-extras \
    cloud-datastore-emulator

# Need to upgrade pip to support installation of the cryptography module
RUN pip install --upgrade pip

# Create and switch to a non-root account for the rest of the install
RUN addgroup -S isthislegit && adduser -S isthislegit isthislegit
RUN mkdir /srv/isthislegit && chown -R isthislegit:isthislegit /srv/isthislegit
USER isthislegit
WORKDIR /srv/isthislegit

# Copy and install the dependencies
COPY package.json .
COPY yarn.lock .
RUN  yarn install --dev 

COPY --chown=isthislegit:isthislegit requirements.txt .
RUN pip install -t lib -r requirements.txt

# Build the JS files
COPY --chown=isthislegit:isthislegit . /srv/isthislegit
RUN yarn run gulp

# Setup and execute the dev GAE server
EXPOSE 8080/tcp
ENTRYPOINT ["dev_appserver.py"]
CMD ["--host", "0.0.0.0", \
    "--admin_host", "0.0.0.0", \
    "app.yaml"]