FROM node:lts
RUN npm install -g @gerblins/hobgerblin

VOLUME /config
EXPOSE 8080

ENTRYPOINT [ "hobgerblin" ]
CMD ["-c", "/config/config.yml"]
