'use strict';

var plan = require('flightplan');

plan.target('production', [
  {
    host: 'geo4web.apiwise.nl',
    username: 'centos',
    agent: process.env.SSH_AUTH_SOCK,
    privateKey: process.env.HOME + '/.ssh/geo4web.pem'
  }
]);

plan.local(function(local) {
  var files = local.git('ls-files', { silent: true }).stdout.split('\n');

  files = files.concat(
    local.find('node_modules -type f', { silent: true }).stdout.split('\n')
  );

  local.transfer(files, '/home/centos/import');
});
