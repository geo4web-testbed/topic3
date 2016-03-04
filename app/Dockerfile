FROM node:argon

RUN npm install -g -s nodemon

# Create app directory
RUN mkdir /src
WORKDIR /src
VOLUME /src

EXPOSE 3000
CMD npm install -s && nodemon -L
