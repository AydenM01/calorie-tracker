FROM alpine:latest

ARG PB_VERSION=0.22.27

RUN apk add --no-cache \
    unzip \
    ca-certificates

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && rm /tmp/pb.zip

COPY ./index.html /pb/pb_public/index.html
COPY ./setup.html /pb/pb_public/setup.html
COPY ./html5-qrcode.min.js /pb/pb_public/html5-qrcode.min.js

COPY ./entrypoint.sh /pb/entrypoint.sh
RUN chmod +x /pb/entrypoint.sh

EXPOSE 8090

CMD ["/pb/entrypoint.sh"]
