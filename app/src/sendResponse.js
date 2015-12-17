var jade = require('jade');

module.exports = function(req, res, data) {
  res.format({
    'text/html': function() {
      res.send(
        jade.renderFile('./templates/base.jade', data)
      );
    },
    'application/json': function() {
      res.json(data);
    },
    default: function() {
      res.status(406).end();
    }
  });
};
