'use strict';

var mongoose = require('mongoose');

var messageSchema = mongoose.Schema({
    id: String,
    channelID: String,
    text: String,
    user: Object,
    time: String,
    owner: String
});

module.exports = mongoose.model('Message', messageSchema);
