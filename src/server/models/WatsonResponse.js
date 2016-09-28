'use strict';

var mongoose = require('mongoose');

var watsonresponseSchema = mongoose.Schema({
  input: Object,
  alternate_intents: Boolean,
  context: Object,
  entities: [],
  intents: [],
  output: Object
});

module.exports = mongoose.model('WatsonResponse', watsonresponseSchema);
